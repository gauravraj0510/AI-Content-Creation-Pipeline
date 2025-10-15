#!/usr/bin/env python3
"""
RSS Feed Curator - Core Processing Module

This module handles RSS feed fetching and content storage in Firestore.
All timing and scheduling logic is handled by main.py.

Usage:
    from rss_curator import RSSFeedCurator
    
    curator = RSSFeedCurator()
    results = curator.fetch_multiple_feeds(feed_urls)
"""

import feedparser
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timezone
import hashlib
import json
import logging
import time
import signal
import sys
import argparse
import threading
from typing import List, Dict, Any, Optional
import requests
from urllib.parse import urlparse
from pathlib import Path
from .relevance_scorer import RelevanceScorer

# =============================================================================
# GLOBAL CONFIGURATION VARIABLES
# =============================================================================

# Firestore Configuration
DEFAULT_SERVICE_ACCOUNT_PATH = "service_account.json"
DEFAULT_COLLECTION_NAME = "RAW_IDEAS"
DEFAULT_RSS_METADATA_COLLECTION = "RSS_METADATA"

# RSS Processing Configuration
DEFAULT_MAX_ITEMS_PER_FEED = 20
# DEFAULT_MAX_ITEMS_PER_FEED = 10  # For fewer items per feed
# DEFAULT_MAX_ITEMS_PER_FEED = 50  # For more items per feed

# Logging Configuration
DEFAULT_LOG_LEVEL = logging.INFO

# Configure logging
logging.basicConfig(
    level=DEFAULT_LOG_LEVEL,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RSSFeedCurator:
    """Main class for curating RSS feeds and storing content in Firestore."""
    
    def __init__(self, service_account_path: str = None, max_items_per_feed: int = None, 
                 gemini_api_key: str = None, enable_relevance_scoring: bool = True):
        """Initialize the RSS Feed Curator with Firestore connection."""
        self.service_account_path = service_account_path or DEFAULT_SERVICE_ACCOUNT_PATH
        self.db = None
        self.collection_name = DEFAULT_COLLECTION_NAME
        self.RSS_METADATA_collection = DEFAULT_RSS_METADATA_COLLECTION
        self.max_items_per_feed = max_items_per_feed or DEFAULT_MAX_ITEMS_PER_FEED
        self.running = True
        self.enable_relevance_scoring = enable_relevance_scoring
        
        # Initialize relevance scorer if enabled
        self.relevance_scorer = None
        if self.enable_relevance_scoring:
            try:
                self.relevance_scorer = RelevanceScorer(api_key=gemini_api_key)
                logger.info("✅ Relevance scoring enabled")
            except Exception as e:
                logger.warning(f"⚠️  Relevance scoring disabled due to error: {e}")
                self.enable_relevance_scoring = False
        
        self._initialize_firestore()
    
    def _initialize_firestore(self):
        """Initialize Firestore connection using service account."""
        try:
            # Initialize Firebase Admin SDK
            if not firebase_admin._apps:
                cred = credentials.Certificate(self.service_account_path)
                firebase_admin.initialize_app(cred)
            
            # Get Firestore client
            self.db = firestore.client()
            logger.info("✅ Firestore connection initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Firestore: {e}")
            raise
    
    def _generate_content_hash(self, title: str, link: str, description: str = "") -> str:
        """Generate a unique hash for content to detect duplicates."""
        content_string = f"{title}|{link}|{description}"
        return hashlib.md5(content_string.encode('utf-8')).hexdigest()
    
    def _get_RSS_METADATA(self, feed_url: str) -> Dict[str, Any]:
        """Get metadata for a feed including last processed timestamp."""
        try:
            doc_ref = self.db.collection(self.RSS_METADATA_collection).document(
                self._generate_content_hash(feed_url, "", "")
            )
            doc = doc_ref.get()
            
            if doc.exists:
                return doc.to_dict()
            else:
                # Create new metadata document
                metadata = {
                    "feed_url": feed_url,
                    "last_processed": None,
                    "total_items_processed": 0,
                    "created_at": datetime.now(timezone.utc),
                    "last_updated": datetime.now(timezone.utc)
                }
                doc_ref.set(metadata)
                return metadata
                
        except Exception as e:
            logger.error(f"Error getting feed metadata for {feed_url}: {e}")
            return {
                "feed_url": feed_url,
                "last_processed": None,
                "total_items_processed": 0,
                "created_at": datetime.now(timezone.utc),
                "last_updated": datetime.now(timezone.utc)
            }
    
    def _update_RSS_METADATA(self, feed_url: str, last_processed: datetime, items_processed: int):
        """Update feed metadata with latest processing information."""
        try:
            doc_ref = self.db.collection(self.RSS_METADATA_collection).document(
                self._generate_content_hash(feed_url, "", "")
            )
            
            doc_ref.update({
                "last_processed": last_processed,
                "total_items_processed": firestore.Increment(items_processed),
                "last_updated": datetime.now(timezone.utc)
            })
            
        except Exception as e:
            logger.error(f"Error updating feed metadata for {feed_url}: {e}")
    
    def _parse_feed_date(self, date_string: str) -> Optional[datetime]:
        """Parse various date formats from RSS feeds."""
        if not date_string:
            return None
            
        try:
            # Try parsing with feedparser's parsed date
            parsed_date = feedparser._parse_date(date_string)
            if parsed_date:
                return datetime(*parsed_date[:6], tzinfo=timezone.utc)
        except:
            pass
        
        try:
            # Fallback to datetime parsing
            from dateutil import parser
            return parser.parse(date_string).replace(tzinfo=timezone.utc)
        except:
            logger.warning(f"Could not parse date: {date_string}")
            return None
    
    def _is_new_content(self, entry: Dict[str, Any], last_processed: Optional[datetime]) -> bool:
        """Check if content is new based on publication date."""
        if not last_processed:
            return True
        
        entry_date = self._parse_feed_date(entry.get('published', ''))
        if not entry_date:
            # If we can't parse the date, assume it's new
            return True
        
        return entry_date > last_processed
    
    def _extract_content_data(self, entry: Dict[str, Any], feed_url: str) -> Dict[str, Any]:
        """Extract and structure content data from RSS entry."""
        # Generate unique ID for this content
        content_hash = self._generate_content_hash(
            entry.get('title', ''),
            entry.get('link', ''),
            entry.get('summary', '')
        )
        
        # Extract domain from feed URL for categorization
        domain = urlparse(feed_url).netloc
        
        # Parse publication date
        published_date = self._parse_feed_date(entry.get('published', ''))
        
        content_data = {
            "id": content_hash,
            "title": entry.get('title', 'No Title'),
            "link": entry.get('link', ''),
            "description": entry.get('summary', entry.get('description', '')),
            "published": published_date,
            "author": entry.get('author', ''),
            "source_type": "rss_feed",
            "source_url": feed_url,
            "source_domain": domain,
            "source_name": f"RSS Feed - {domain}",
            "tags": entry.get('tags', []),
            "content_hash": content_hash,
            "created_at": datetime.now(timezone.utc),
            "processed_at": datetime.now(timezone.utc)
        }
        
        # Add any additional fields that might be useful
        if hasattr(entry, 'media_content'):
            content_data['media_content'] = entry.media_content
        
        if hasattr(entry, 'enclosures'):
            content_data['enclosures'] = entry.enclosures
        
        return content_data
    
    def _store_content(self, content_data: Dict[str, Any]) -> bool:
        """Store content in Firestore if it doesn't already exist."""
        try:
            doc_ref = self.db.collection(self.collection_name).document(content_data['id'])
            
            # Check if document already exists
            if doc_ref.get().exists:
                logger.debug(f"Content already exists: {content_data['title']}")
                return False
            
            # Calculate relevance score if enabled
            if self.enable_relevance_scoring and self.relevance_scorer:
                try:
                    logger.info(f"🧠 Calculating relevance score for: {content_data['title'][:50]}...")
                    relevance_result = self.relevance_scorer.calculate_relevance_score(content_data)
                    content_data.update(relevance_result)
                    logger.info(f"📊 Relevance score: {relevance_result.get('relevance_score', 'N/A')}/100")
                except Exception as e:
                    logger.warning(f"⚠️  Failed to calculate relevance score: {e}")
                    # Add default relevance data
                    content_data.update({
                        "relevance_score": -1,
                        "is_relevant": False,
                        "evaluation_timestamp": datetime.now(timezone.utc),
                        "evaluation_model": "error"
                    })
            
            # Store the content
            doc_ref.set(content_data)
            logger.info(f"📝 Stored new content: {content_data['title']}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing content: {e}")
            return False
    
    def fetch_feed(self, feed_url: str, current_feed: int, total_feeds: int) -> Dict[str, Any]:
        """Fetch and process a single RSS feed."""
        # Extract domain name for cleaner display
        domain = urlparse(feed_url).netloc.replace('www.', '')
        
        logger.info("")
        logger.info("┌" + "─" * 78 + "┐")
        logger.info(f"│ 📡 FEED {current_feed}/{total_feeds}: {domain:<50}")
        logger.info(f"│ 🔗 {feed_url:<70}")
        logger.info("└" + "─" * 78 + "┘")
        
        try:
            # Get feed metadata
            metadata = self._get_RSS_METADATA(feed_url)
            last_processed = metadata.get('last_processed')
            
            # Parse the RSS feed
            logger.info("   🔍 Parsing RSS feed...")
            feed = feedparser.parse(feed_url)
            
            if feed.bozo:
                logger.warning(f"   ⚠️  Feed parsing issues: {feed.bozo_exception}")
            
            if not feed.entries:
                logger.warning("   ❌ No entries found in feed")
                logger.info("   └─ Feed processing completed (no content)")
                return {
                    "feed_url": feed_url,
                    "status": "no_entries",
                    "new_items": 0,
                    "total_items": 0
                }
            
            new_items_count = 0
            latest_processed_date = last_processed
            
            # Limit to latest N items from RSS feed (default: 20)
            latest_entries = feed.entries[:self.max_items_per_feed]
            feed_title = feed.feed.get('title', 'Unknown Feed')
            
            logger.info(f"   📊 Feed: {feed_title}")
            logger.info(f"   📈 Total items in feed: {len(feed.entries)}")
            logger.info(f"   🎯 Processing latest: {len(latest_entries)} items")
            logger.info("   ┌─ Processing items:")
            
            # Process each entry (limited to latest N items)
            for i, entry in enumerate(latest_entries, 1):
                # Check if this is new content
                if self._is_new_content(entry, last_processed):
                    # Extract content data
                    content_data = self._extract_content_data(entry, feed_url)
                    
                    # Store in Firestore
                    if self._store_content(content_data):
                        new_items_count += 1
                        logger.info(f"   │  ✅ [{i:2d}/{len(latest_entries):2d}] NEW: {content_data['title'][:50]}{'...' if len(content_data['title']) > 50 else ''}")
                        
                        # Update latest processed date
                        entry_date = content_data.get('published')
                        if entry_date and (not latest_processed_date or entry_date > latest_processed_date):
                            latest_processed_date = entry_date
                    else:
                        logger.info(f"   │  ⏭️  [{i:2d}/{len(latest_entries):2d}] SKIP: {content_data['title'][:50]}{'...' if len(content_data['title']) > 50 else ''} (duplicate)")
                else:
                    logger.info(f"   │  ⏭️  [{i:2d}/{len(latest_entries):2d}] SKIP: {entry.get('title', 'No Title')[:50]}{'...' if len(entry.get('title', '')) > 50 else ''} (old content)")
            
            logger.info("   └─ Item processing completed")
            
            # Update feed metadata
            if new_items_count > 0 or latest_processed_date != last_processed:
                self._update_RSS_METADATA(feed_url, latest_processed_date, new_items_count)
            
            # Summary
            logger.info("   ┌─ FEED SUMMARY:")
            logger.info(f"   │  📝 New items stored: {new_items_count}")
            logger.info(f"   │  📊 Items processed: {len(latest_entries)}")
            logger.info(f"   │  📈 Total in feed: {len(feed.entries)}")
            logger.info("   └─ Feed processing completed ✅")
            
            return {
                "feed_url": feed_url,
                "status": "success",
                "new_items": new_items_count,
                "total_items": len(feed.entries),
                "processed_items": len(latest_entries),
                "feed_title": feed_title,
                "last_processed": latest_processed_date
            }
            
        except Exception as e:
            logger.error(f"Error processing feed {feed_url}: {e}")
            return {
                "feed_url": feed_url,
                "status": "error",
                "error": str(e),
                "new_items": 0,
                "total_items": 0
            }
    
    def fetch_multiple_feeds(self, feed_urls: List[str]) -> List[Dict[str, Any]]:
        """Fetch and process multiple RSS feeds."""
        results = []
        
        logger.info("")
        logger.info("╔" + "═" * 80 + "╗")
        logger.info(f"║ 🚀 STARTING RSS FEED PROCESSING - {len(feed_urls)} FEEDS TO PROCESS")
        logger.info("╚" + "═" * 80 + "╝")
        
        for i, feed_url in enumerate(feed_urls, 1):
            if not self.running:
                logger.info("🛑 Stopping feed processing...")
                break
                
            result = self.fetch_feed(feed_url, i, len(feed_urls))
            results.append(result)
        
        # Final Summary
        total_new_items = sum(r.get('new_items', 0) for r in results)
        successful_feeds = len([r for r in results if r.get('status') == 'success'])
        
        logger.info("")
        logger.info("╔" + "═" * 80 + "╗")
        logger.info("║ 📊 CYCLE SUMMARY")
        logger.info("╠" + "─" * 80 + "╣")
        logger.info(f"║ ✅ Successful feeds: {successful_feeds}/{len(feed_urls):<60}")
        logger.info(f"║ 📝 Total new items: {total_new_items:<65}")
        logger.info(f"║ 🎯 Success rate: {(successful_feeds/len(feed_urls)*100):.1f}%{'':<60}")
        logger.info("╚" + "═" * 80 + "╝")
        
        return results
    
    def get_feed_statistics(self) -> Dict[str, Any]:
        """Get statistics about processed feeds and content."""
        try:
            # Get feed metadata
            RSS_METADATA = self.db.collection(self.RSS_METADATA_collection).get()
            total_feeds = len(RSS_METADATA)
            total_processed_items = sum(doc.to_dict().get('total_items_processed', 0) for doc in RSS_METADATA)
            
            # Get content statistics
            content_docs = self.db.collection(self.collection_name).get()
            total_content_items = len(content_docs)
            
            return {
                "total_feeds_configured": total_feeds,
                "total_items_processed": total_processed_items,
                "total_content_items": total_content_items,
                "collection_name": self.collection_name
            }
            
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {}
    
    def stop(self):
        """Stop the curator."""
        self.running = False
        logger.info("🛑 RSS Curator stop requested")


class RSSCuratorRunner:
    """Main runner class that handles timing and RSS curator execution."""
    
    def __init__(self, service_account_path: str = None, 
                 max_items_per_feed: int = None, feed_urls: List[str] = None,
                 gemini_api_key: str = None, enable_relevance_scoring: bool = True):
        """Initialize the RSS curator runner."""
        self.running = False
        self.curator = None
        self.service_account_path = service_account_path or DEFAULT_SERVICE_ACCOUNT_PATH
        self.max_items_per_feed = max_items_per_feed or DEFAULT_MAX_ITEMS_PER_FEED
        self.feed_urls = feed_urls or []
        self.gemini_api_key = gemini_api_key
        self.enable_relevance_scoring = enable_relevance_scoring
    
    
    def _run_curation_cycle(self):
        """Run a single RSS curation cycle."""
        try:
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            logger.info("")
            logger.info("╔" + "═" * 80 + "╗")
            logger.info(f"║ 🔄 RSS CURATION CYCLE STARTED")
            logger.info(f"║ ⏰ Time: {current_time:<60}")
            logger.info("╚" + "═" * 80 + "╝")
            
            # Process feeds
            results = self.curator.fetch_multiple_feeds(self.feed_urls)
            
            # Get and display statistics
            stats = self.curator.get_feed_statistics()
            if stats:
                logger.info("")
                logger.info("╔" + "═" * 80 + "╗")
                logger.info("║ 📊 DATABASE STATISTICS")
                logger.info("╠" + "─" * 80 + "╣")
                logger.info(f"║ 📁 Total content items: {stats.get('total_content_items', 0):<60}")
                logger.info(f"║ 🔗 Total feeds configured: {stats.get('total_feeds_configured', 0):<60}")
                logger.info(f"║ 📝 Total items processed: {stats.get('total_items_processed', 0):<60}")
                logger.info("╚" + "═" * 80 + "╝")
            
            logger.info("")
            logger.info("╔" + "═" * 80 + "╗")
            logger.info("║ ✅ CYCLE COMPLETED SUCCESSFULLY")
            logger.info("╚" + "═" * 80 + "╝")
            
        except Exception as e:
            logger.error("")
            logger.error("╔" + "═" * 80 + "╗")
            logger.error("║ ❌ CYCLE ERROR ║")
            logger.error("╠" + "─" * 80 + "╣")
            logger.error(f"║ Error: {str(e):<70} ║")
            logger.error("╚" + "═" * 80 + "╝")
    
    
    def start(self):
        """Start the RSS curator runner (runs once)."""
        if self.running:
            logger.warning("⚠️  RSS Curator Runner is already running!")
            return
        
        self.running = True
        
        # Initialize curator
        try:
            self.curator = RSSFeedCurator(
                service_account_path=self.service_account_path,
                max_items_per_feed=self.max_items_per_feed,
                gemini_api_key=self.gemini_api_key,
                enable_relevance_scoring=self.enable_relevance_scoring
            )
        except Exception as e:
            logger.error(f"❌ Failed to initialize RSS curator: {e}")
            return
        
        try:
            # Run curation cycle once
            self._run_curation_cycle()
        except Exception as e:
            logger.error(f"❌ Error during curation cycle: {e}")
        finally:
            self.stop()
    
    def stop(self):
        """Stop the RSS curator runner."""
        if not self.running:
            return
            
        logger.info("")
        logger.info("╔" + "═" * 80 + "╗")
        logger.info("║ 🛑 STOPPING RSS CURATOR RUNNER")
        logger.info("╚" + "═" * 80 + "╝")
        self.running = False
        
        if self.curator:
            self.curator.stop()
        
        logger.info("")
        logger.info("╔" + "═" * 80 + "╗")
        logger.info("║ ✅ RUNNER STOPPED SUCCESSFULLY")
        logger.info("╚" + "═" * 80 + "╝")
    
    def run_once(self):
        """Run a single RSS curation cycle and exit."""
        logger.info("")
        logger.info("╔" + "═" * 80 + "╗")
        logger.info("║ 🔄 RUNNING SINGLE RSS CURATION CYCLE ║")
        logger.info("╚" + "═" * 80 + "╝")
        
        try:
            self.curator = RSSFeedCurator(
                service_account_path=self.service_account_path,
                max_items_per_feed=self.max_items_per_feed,
                gemini_api_key=self.gemini_api_key,
                enable_relevance_scoring=self.enable_relevance_scoring
            )
            self._run_curation_cycle()
        except Exception as e:
            logger.error(f"❌ Error during single run: {e}")
        finally:
            logger.info("")
            logger.info("╔" + "═" * 80 + "╗")
            logger.info("║ ✅ SINGLE CYCLE COMPLETED - EXITING ║")
            logger.info("╚" + "═" * 80 + "╝")
