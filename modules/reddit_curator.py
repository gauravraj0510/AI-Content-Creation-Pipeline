#!/usr/bin/env python3
"""
Reddit Post Curator - Core Processing Module

This module handles Reddit post fetching and content storage in Firestore.
Uses the Reddit API (PRAW) to fetch posts from specified subreddits.

Usage:
    from reddit_curator import RedditPostCurator
    
    curator = RedditPostCurator()
    results = curator.fetch_multiple_subreddits(subreddit_list)
"""

import praw
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timezone, timedelta
import hashlib
import json
import logging
import time
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse
import re
from .relevance_scorer import RelevanceScorer

# =============================================================================
# GLOBAL CONFIGURATION VARIABLES
# =============================================================================

# Reddit API Configuration
# Configuration is now handled in main.py
REDDIT_USER_AGENT = "AI Content Creation Pipeline v1.0"

# Firestore Configuration
DEFAULT_SERVICE_ACCOUNT_PATH = "service_account.json"
DEFAULT_COLLECTION_NAME = "RAW_IDEAS"
DEFAULT_SUBREDDIT_METADATA_COLLECTION = "SUBREDDIT_METADATA"

# Reddit Processing Configuration
# Configuration is now handled in main.py

# Configure logging
logger = logging.getLogger(__name__)


class RedditPostCurator:
    """Main class for curating Reddit posts and storing content in Firestore."""
    
    def __init__(self, service_account_path: str = None, 
                 reddit_client_id: str = None, reddit_client_secret: str = None,
                 max_posts_per_subreddit: int = 5, time_filter: str = "day",
                 gemini_api_key: str = None, enable_relevance_scoring: bool = True,
                 system_prompt: str = None):
        """Initialize the Reddit Post Curator with Reddit API and Firestore connection."""
        self.service_account_path = service_account_path or DEFAULT_SERVICE_ACCOUNT_PATH
        self.reddit_client_id = reddit_client_id
        self.reddit_client_secret = reddit_client_secret
        self.user_agent = REDDIT_USER_AGENT
        self.max_posts_per_subreddit = max_posts_per_subreddit
        self.time_filter = time_filter
        self.enable_relevance_scoring = enable_relevance_scoring
        
        self.db = None
        self.reddit = None
        self.collection_name = DEFAULT_COLLECTION_NAME
        self.subreddit_metadata_collection = DEFAULT_SUBREDDIT_METADATA_COLLECTION
        self.running = True
        
        # Initialize relevance scorer if enabled
        self.relevance_scorer = None
        if self.enable_relevance_scoring:
            try:
                self.relevance_scorer = RelevanceScorer(api_key=gemini_api_key, system_prompt=system_prompt)
                logger.info("✅ Relevance scoring enabled")
            except Exception as e:
                logger.warning(f"⚠️  Relevance scoring disabled due to error: {e}")
                self.enable_relevance_scoring = False
        
        self._initialize_reddit()
        self._initialize_firestore()
    
    def _initialize_reddit(self):
        """Initialize Reddit API connection using PRAW."""
        try:
            if not self.reddit_client_id or self.reddit_client_id == "YOUR_REDDIT_CLIENT_ID":
                raise ValueError("Reddit Client ID not configured. Please set REDDIT_CLIENT_ID in reddit_curator.py")
            
            if not self.reddit_client_secret or self.reddit_client_secret == "YOUR_REDDIT_CLIENT_SECRET":
                raise ValueError("Reddit Client Secret not configured. Please set REDDIT_CLIENT_SECRET in reddit_curator.py")
            
            # Initialize Reddit API
            self.reddit = praw.Reddit(
                client_id=self.reddit_client_id,
                client_secret=self.reddit_client_secret,
                user_agent=self.user_agent
            )
            
            # Test the connection
            self.reddit.read_only = True
            logger.info("✅ Reddit API connection initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Reddit API: {e}")
            raise
    
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
    
    def _generate_content_hash(self, title: str, post_id: str, subreddit: str) -> str:
        """Generate a unique hash for Reddit post to detect duplicates."""
        content_string = f"{title}|{post_id}|{subreddit}"
        return hashlib.md5(content_string.encode('utf-8')).hexdigest()
    
    def _get_subreddit_metadata(self, subreddit_name: str) -> Dict[str, Any]:
        """Get metadata for a subreddit including last processed timestamp."""
        try:
            doc_ref = self.db.collection(self.subreddit_metadata_collection).document(
                self._generate_content_hash(subreddit_name, "", "")
            )
            doc = doc_ref.get()
            
            if doc.exists:
                return doc.to_dict()
            else:
                # Create new metadata document
                metadata = {
                    "subreddit_name": subreddit_name,
                    "last_processed": None,
                    "total_posts_processed": 0,
                    "created_at": datetime.now(timezone.utc),
                    "last_updated": datetime.now(timezone.utc)
                }
                doc_ref.set(metadata)
                return metadata
                
        except Exception as e:
            logger.error(f"Error getting subreddit metadata for r/{subreddit_name}: {e}")
            return {
                "subreddit_name": subreddit_name,
                "last_processed": None,
                "total_posts_processed": 0,
                "created_at": datetime.now(timezone.utc),
                "last_updated": datetime.now(timezone.utc)
            }
    
    def _update_subreddit_metadata(self, subreddit_name: str, last_processed: datetime, posts_processed: int):
        """Update subreddit metadata with latest processing information."""
        try:
            doc_ref = self.db.collection(self.subreddit_metadata_collection).document(
                self._generate_content_hash(subreddit_name, "", "")
            )
            
            doc_ref.update({
                "last_processed": last_processed,
                "total_posts_processed": firestore.Increment(posts_processed),
                "last_updated": datetime.now(timezone.utc)
            })
            
        except Exception as e:
            logger.error(f"Error updating subreddit metadata for r/{subreddit_name}: {e}")
    
    def _is_new_content(self, post, last_processed: Optional[datetime]) -> bool:
        """Check if Reddit post is new based on creation date."""
        if not last_processed:
            return True
        
        post_date = datetime.fromtimestamp(post.created_utc, tz=timezone.utc)
        return post_date > last_processed
    
    def _clean_text(self, text: str) -> str:
        """Clean Reddit post text by removing markdown and special characters."""
        if not text:
            return ""
        
        # Remove markdown links [text](url) -> text
        text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
        
        # Remove markdown bold/italic
        text = re.sub(r'\*\*([^\*]+)\*\*', r'\1', text)
        text = re.sub(r'\*([^\*]+)\*', r'\1', text)
        
        # Remove markdown headers
        text = re.sub(r'^#+\s*', '', text, flags=re.MULTILINE)
        
        # Remove excessive whitespace
        text = re.sub(r'\n\s*\n', '\n\n', text)
        text = text.strip()
        
        return text
    
    def _extract_post_data(self, post, subreddit_name: str) -> Dict[str, Any]:
        """Extract and structure Reddit post data."""
        # Generate unique ID for this content
        content_hash = self._generate_content_hash(
            post.title,
            post.id,
            subreddit_name
        )
        
        # Parse creation date
        published_date = datetime.fromtimestamp(post.created_utc, tz=timezone.utc)
        
        # Clean post content
        post_content = self._clean_text(post.selftext) if post.selftext else ""
        
        # Extract post URL
        post_url = f"https://reddit.com{post.permalink}"
        
        # Calculate word count
        word_count = len(post_content.split()) if post_content else 0
        reading_time_minutes = max(1, word_count // 200)  # Assume 200 words per minute
        
        # Extract tags from post title and content
        all_text = f"{post.title} {post_content}".lower()
        tags = []
        
        # Common AI/tech tags
        tech_keywords = ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 
                        'neural network', 'gpt', 'chatgpt', 'openai', 'google', 'microsoft',
                        'programming', 'coding', 'python', 'javascript', 'react', 'vue',
                        'startup', 'tech', 'technology', 'innovation', 'automation']
        
        for keyword in tech_keywords:
            if keyword in all_text:
                tags.append(keyword.title())
        
        # Remove duplicates and limit tags
        tags = list(set(tags))[:10]
        
        post_data = {
            "id": content_hash,
            "title": post.title,
            "link": post_url,
            "description": post_content[:500] + "..." if len(post_content) > 500 else post_content,
            "content": post_content,
            "published": published_date,
            "author": str(post.author) if post.author else "[deleted]",
            "source_type": "reddit_post",
            "source_url": post_url,
            "source_domain": "reddit.com",
            "source_name": f"r/{subreddit_name}",
            "tags": tags,
            "content_hash": content_hash,
            "human_approved": False,
            "reel_generated": False,
            "created_at": datetime.now(timezone.utc),
            "processed_at": datetime.now(timezone.utc)
        }
        
        return post_data
    
    def _store_content(self, content_data: Dict[str, Any]) -> bool:
        """Store Reddit post content in Firestore if it doesn't already exist."""
        try:
            doc_ref = self.db.collection(self.collection_name).document(content_data['id'])
            
            # Check if document already exists
            if doc_ref.get().exists:
                logger.debug(f"Reddit post already exists: {content_data['title']}")
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
            logger.info(f"📝 Stored new Reddit post: {content_data['title']}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing Reddit post: {e}")
            return False
    
    def fetch_subreddit(self, subreddit_name: str, current_subreddit: int, total_subreddits: int) -> Dict[str, Any]:
        """Fetch and process posts from a single subreddit."""
        logger.info("")
        logger.info("┌" + "─" * 78 + "┐")
        logger.info(f"│ 🔴 SUBREDDIT {current_subreddit}/{total_subreddits}: r/{subreddit_name:<50}")
        logger.info(f"│ ⏰ Time filter: {self.time_filter:<70}")
        logger.info("└" + "─" * 78 + "┘")
        
        try:
            # Get subreddit metadata
            metadata = self._get_subreddit_metadata(subreddit_name)
            last_processed = metadata.get('last_processed')
            
            # Get subreddit object
            logger.info("   🔍 Fetching subreddit posts...")
            subreddit = self.reddit.subreddit(subreddit_name)
            
            # Fetch hot posts with time filter
            posts = list(subreddit.hot(limit=self.max_posts_per_subreddit * 2))  # Get more to filter
            
            if not posts:
                logger.warning("   ❌ No posts found in subreddit")
                logger.info("   └─ Subreddit processing completed (no content)")
                return {
                    "subreddit_name": subreddit_name,
                    "status": "no_posts",
                    "new_posts": 0,
                    "total_posts": 0
                }
            
            new_posts_count = 0
            latest_processed_date = last_processed
            
            logger.info(f"   📊 Subreddit: r/{subreddit_name}")
            logger.info(f"   📈 Total posts fetched: {len(posts)}")
            logger.info(f"   🎯 Processing latest: {min(len(posts), self.max_posts_per_subreddit)} posts")
            logger.info("   ┌─ Processing posts:")
            
            # Process each post (limited to max_posts_per_subreddit)
            processed_posts = 0
            for i, post in enumerate(posts, 1):
                if processed_posts >= self.max_posts_per_subreddit:
                    break
                
                # Check if this is new content
                if self._is_new_content(post, last_processed):
                    # Extract post data
                    post_data = self._extract_post_data(post, subreddit_name)
                    
                    # Store in Firestore
                    if self._store_content(post_data):
                        new_posts_count += 1
                        processed_posts += 1
                        logger.info(f"   │  ✅ [{processed_posts:2d}/{self.max_posts_per_subreddit:2d}] NEW: {post_data['title'][:50]}{'...' if len(post_data['title']) > 50 else ''}")
                        
                        # Update latest processed date
                        post_date = post_data.get('published')
                        if post_date and (not latest_processed_date or post_date > latest_processed_date):
                            latest_processed_date = post_date
                    else:
                        logger.info(f"   │  ⏭️  [{processed_posts+1:2d}/{self.max_posts_per_subreddit:2d}] SKIP: {post_data['title'][:50]}{'...' if len(post_data['title']) > 50 else ''} (duplicate)")
                        processed_posts += 1
                else:
                    logger.info(f"   │  ⏭️  [{processed_posts+1:2d}/{self.max_posts_per_subreddit:2d}] SKIP: {post.title[:50]}{'...' if len(post.title) > 50 else ''} (old content)")
                    processed_posts += 1
            
            logger.info("   └─ Post processing completed")
            
            # Update subreddit metadata
            if new_posts_count > 0 or latest_processed_date != last_processed:
                self._update_subreddit_metadata(subreddit_name, latest_processed_date, new_posts_count)
            
            # Summary
            logger.info("   ┌─ SUBREDDIT SUMMARY:")
            logger.info(f"   │  📝 New posts stored: {new_posts_count}")
            logger.info(f"   │  📊 Posts processed: {processed_posts}")
            logger.info(f"   │  📈 Total posts fetched: {len(posts)}")
            logger.info("   └─ Subreddit processing completed ✅")
            
            return {
                "subreddit_name": subreddit_name,
                "status": "success",
                "new_posts": new_posts_count,
                "total_posts": len(posts),
                "processed_posts": processed_posts,
                "last_processed": latest_processed_date
            }
            
        except Exception as e:
            logger.error(f"Error processing subreddit r/{subreddit_name}: {e}")
            return {
                "subreddit_name": subreddit_name,
                "status": "error",
                "error": str(e),
                "new_posts": 0,
                "total_posts": 0
            }
    
    def fetch_multiple_subreddits(self, subreddit_names: List[str]) -> List[Dict[str, Any]]:
        """Fetch and process posts from multiple subreddits."""
        results = []
        
        logger.info("")
        logger.info("╔" + "═" * 80 + "╗")
        logger.info(f"║ 🔴 STARTING REDDIT POST PROCESSING - {len(subreddit_names)} SUBREDDITS TO PROCESS")
        logger.info("╚" + "═" * 80 + "╝")
        
        for i, subreddit_name in enumerate(subreddit_names, 1):
            if not self.running:
                logger.info("🛑 Stopping subreddit processing...")
                break
                
            result = self.fetch_subreddit(subreddit_name, i, len(subreddit_names))
            results.append(result)
        
        # Final Summary
        total_new_posts = sum(r.get('new_posts', 0) for r in results)
        successful_subreddits = len([r for r in results if r.get('status') == 'success'])
        
        logger.info("")
        logger.info("╔" + "═" * 80 + "╗")
        logger.info("║ 📊 CYCLE SUMMARY")
        logger.info("╠" + "─" * 80 + "╣")
        logger.info(f"║ ✅ Successful subreddits: {successful_subreddits}/{len(subreddit_names):<60}")
        logger.info(f"║ 📝 Total new posts: {total_new_posts:<65}")
        logger.info(f"║ 🎯 Success rate: {(successful_subreddits/len(subreddit_names)*100):.1f}%{'':<60}")
        logger.info("╚" + "═" * 80 + "╝")
        
        return results
    
    def get_subreddit_statistics(self) -> Dict[str, Any]:
        """Get statistics about processed subreddits and content."""
        try:
            # Get subreddit metadata
            subreddit_metadata = self.db.collection(self.subreddit_metadata_collection).get()
            total_subreddits = len(subreddit_metadata)
            total_processed_posts = sum(doc.to_dict().get('total_posts_processed', 0) for doc in subreddit_metadata)
            
            # Get content statistics
            content_docs = self.db.collection(self.collection_name).get()
            total_content_items = len(content_docs)
            
            return {
                "total_subreddits_configured": total_subreddits,
                "total_posts_processed": total_processed_posts,
                "total_content_items": total_content_items,
                "collection_name": self.collection_name
            }
            
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {}
    
    def stop(self):
        """Stop the curator."""
        self.running = False
        logger.info("🛑 Reddit Curator stop requested")


class RedditCuratorRunner:
    """Main runner class that handles Reddit curator execution."""
    
    def __init__(self, service_account_path: str = None, 
                 reddit_client_id: str = None, reddit_client_secret: str = None,
                 max_posts_per_subreddit: int = 5, time_filter: str = "day",
                 subreddit_names: List[str] = None, gemini_api_key: str = None,
                 enable_relevance_scoring: bool = True, system_prompt: str = None):
        """Initialize the Reddit curator runner."""
        self.running = False
        self.curator = None
        self.service_account_path = service_account_path or DEFAULT_SERVICE_ACCOUNT_PATH
        self.reddit_client_id = reddit_client_id
        self.reddit_client_secret = reddit_client_secret
        self.max_posts_per_subreddit = max_posts_per_subreddit
        self.time_filter = time_filter
        self.subreddit_names = subreddit_names or []
        self.gemini_api_key = gemini_api_key
        self.enable_relevance_scoring = enable_relevance_scoring
        self.system_prompt = system_prompt
    
    def _run_curation_cycle(self):
        """Run a single Reddit curation cycle."""
        try:
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            logger.info("")
            logger.info("╔" + "═" * 80 + "╗")
            logger.info(f"║ 🔴 REDDIT CURATION CYCLE STARTED")
            logger.info(f"║ ⏰ Time: {current_time:<60}")
            logger.info("╚" + "═" * 80 + "╝")
            
            # Process subreddits
            results = self.curator.fetch_multiple_subreddits(self.subreddit_names)
            
            # Get and display statistics
            stats = self.curator.get_subreddit_statistics()
            if stats:
                logger.info("")
                logger.info("╔" + "═" * 80 + "╗")
                logger.info("║ 📊 DATABASE STATISTICS")
                logger.info("╠" + "─" * 80 + "╣")
                logger.info(f"║ 📁 Total content items: {stats.get('total_content_items', 0):<60}")
                logger.info(f"║ 🔴 Total subreddits configured: {stats.get('total_subreddits_configured', 0):<60}")
                logger.info(f"║ 📝 Total posts processed: {stats.get('total_posts_processed', 0):<60}")
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
        """Start the Reddit curator runner (runs once)."""
        if self.running:
            logger.warning("⚠️  Reddit Curator Runner is already running!")
            return
        
        self.running = True
        
        # Initialize curator
        try:
            self.curator = RedditPostCurator(
                service_account_path=self.service_account_path,
                reddit_client_id=self.reddit_client_id,
                reddit_client_secret=self.reddit_client_secret,
                max_posts_per_subreddit=self.max_posts_per_subreddit,
                time_filter=self.time_filter,
                gemini_api_key=self.gemini_api_key,
                enable_relevance_scoring=self.enable_relevance_scoring,
                system_prompt=self.system_prompt
            )
        except Exception as e:
            logger.error(f"❌ Failed to initialize Reddit curator: {e}")
            return
        
        try:
            # Run curation cycle once
            self._run_curation_cycle()
        except Exception as e:
            logger.error(f"❌ Error during curation cycle: {e}")
        finally:
            self.stop()
    
    def stop(self):
        """Stop the Reddit curator runner."""
        if not self.running:
            return
            
        logger.info("")
        logger.info("╔" + "═" * 80 + "╗")
        logger.info("║ 🛑 STOPPING REDDIT CURATOR RUNNER")
        logger.info("╚" + "═" * 80 + "╝")
        self.running = False
        
        if self.curator:
            self.curator.stop()
        
        logger.info("")
        logger.info("╔" + "═" * 80 + "╗")
        logger.info("║ ✅ RUNNER STOPPED SUCCESSFULLY")
        logger.info("╚" + "═" * 80 + "╝")
