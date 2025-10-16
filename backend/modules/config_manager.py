#!/usr/bin/env python3
"""
Configuration Manager - Centralized configuration management

This module handles reading configuration from Firestore and environment variables,
providing a centralized way to manage all application settings.

Usage:
    from modules.config_manager import ConfigManager
    
    config = ConfigManager()
    system_prompt = config.get_system_prompt()
    rss_feeds = config.get_rss_feed_urls()
"""

import firebase_admin
from firebase_admin import credentials, firestore
import os
import logging
from typing import List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Configuration
DEFAULT_SERVICE_ACCOUNT_PATH = "service_account.json"
SETTINGS_COLLECTION = "SETTINGS"


class ConfigManager:
    """Centralized configuration manager for the application."""
    
    def __init__(self, service_account_path: str = None):
        """Initialize the configuration manager."""
        self.service_account_path = service_account_path or DEFAULT_SERVICE_ACCOUNT_PATH
        self.db = None
        self._cache = {}  # Cache for Firestore data
        self._cache_timestamp = None
        self._cache_ttl = 300  # Cache for 5 minutes
        
        self._initialize_firestore()
    
    def _initialize_firestore(self):
        """Initialize Firestore connection."""
        try:
            # Initialize Firebase Admin SDK
            if not firebase_admin._apps:
                cred = credentials.Certificate(self.service_account_path)
                firebase_admin.initialize_app(cred)
            
            self.db = firestore.client()
            logger.info("✅ Configuration Manager: Firestore connection initialized")
        except Exception as e:
            logger.warning(f"⚠️  Configuration Manager: Failed to initialize Firestore: {e}")
            self.db = None
    
    def _is_cache_valid(self) -> bool:
        """Check if the cache is still valid."""
        if not self._cache_timestamp:
            return False
        
        current_time = datetime.now(timezone.utc)
        time_diff = (current_time - self._cache_timestamp).total_seconds()
        return time_diff < self._cache_ttl
    
    def _get_from_firestore(self, document_id: str) -> Optional[dict]:
        """Get data from Firestore with caching."""
        if not self.db:
            logger.warning("⚠️  Firestore not available, using fallback values")
            return None
        
        # Check cache first
        if self._is_cache_valid() and document_id in self._cache:
            logger.debug(f"📋 Using cached data for {document_id}")
            return self._cache[document_id]
        
        try:
            doc_ref = self.db.collection(SETTINGS_COLLECTION).document(document_id)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                # Update cache
                self._cache[document_id] = data
                self._cache_timestamp = datetime.now(timezone.utc)
                logger.debug(f"📋 Loaded {document_id} from Firestore and cached")
                return data
            else:
                logger.warning(f"⚠️  Document {document_id} not found in Firestore")
                return None
                
        except Exception as e:
            logger.error(f"❌ Failed to get {document_id} from Firestore: {e}")
            return None
    
    def get_system_prompt(self) -> str:
        """Get the relevance score system prompt from Firestore."""
        data = self._get_from_firestore("PROMPTS")
        
        if data and "relevance_score_system_prompt" in data:
            return data["relevance_score_system_prompt"]
        
        # Default fallback
        default_prompt = """
You are an expert content evaluator for AI influencers. Rate content from 0-100 based on relevance to AI/tech audiences and content creation potential.

Return ONLY a numeric score from 0-100. No explanations, just the number.

Example: 85
"""
        logger.warning("⚠️  Using default relevance score system prompt")
        return default_prompt
    
    def get_rss_feed_urls(self) -> List[str]:
        """Get RSS feed URLs from Firestore."""
        data = self._get_from_firestore("SOURCES")
        
        if data and "rss_feed_urls" in data:
            return data["rss_feed_urls"]
        
        # Default fallback
        default_feeds = []
        logger.warning("⚠️  Using default RSS feed URLs")
        return default_feeds
    
    def get_reddit_subreddits(self) -> List[str]:
        """Get Reddit subreddits from Firestore."""
        data = self._get_from_firestore("SOURCES")
        
        if data and "reddit_subreddits" in data:
            return data["reddit_subreddits"]
        
        # Default fallback
        default_subreddits = []
        logger.warning("⚠️  Using default Reddit subreddits")
        return default_subreddits
    
    def get_gemini_api_key(self) -> Optional[str]:
        """Get Gemini API key from environment variables."""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.warning("⚠️  GEMINI_API_KEY not found in environment variables")
        return api_key
    
    def get_reddit_client_id(self) -> Optional[str]:
        """Get Reddit client ID from environment variables."""
        client_id = os.getenv("REDDIT_CLIENT_ID")
        if not client_id:
            logger.warning("⚠️  REDDIT_CLIENT_ID not found in environment variables")
        return client_id
    
    def get_reddit_client_secret(self) -> Optional[str]:
        """Get Reddit client secret from environment variables."""
        client_secret = os.getenv("REDDIT_CLIENT_SECRET")
        if not client_secret:
            logger.warning("⚠️  REDDIT_CLIENT_SECRET not found in environment variables")
        return client_secret
    
    def get_reddit_user_agent(self) -> str:
        """Get Reddit user agent (can be hardcoded or from env)."""
        user_agent = os.getenv("REDDIT_USER_AGENT")
        if user_agent:
            return user_agent
        
        # Default user agent
        return "AI Content Creation Pipeline v1.0"
    
    def refresh_cache(self):
        """Force refresh the cache."""
        self._cache.clear()
        self._cache_timestamp = None
        logger.info("🔄 Configuration cache refreshed")
    
    def get_cache_info(self) -> dict:
        """Get information about the current cache."""
        return {
            "cache_size": len(self._cache),
            "cache_timestamp": self._cache_timestamp,
            "cache_valid": self._is_cache_valid(),
            "cached_documents": list(self._cache.keys())
        }
    
    def get_reel_prompt(self) -> str:
        """Get the reel generation prompt from Firestore."""
        data = self._get_from_firestore("PROMPTS")
        
        if data and "reel_prompt" in data:
            return data["reel_prompt"]
        
        # Default fallback
        default_prompt = """You are an expert content creator specializing in viral social media reels. Create engaging reel concepts based on the following raw idea.

REQUIREMENTS:
1. Create exactly {reels_per_idea} different reel concepts
2. Each reel should be unique and engaging
3. Focus on viral potential and audience engagement
4. Make content suitable for short-form video (15-60 seconds)
5. Include specific visual elements and hooks
6. Ensure each concept is distinct and creative while staying true to the original idea

OUTPUT FORMAT:
Return a JSON array with {reels_per_idea} objects. Each object must have these exact fields:

{{
  "reel_title": "Compelling title for the reel",
  "production_status": "pending",
  "production_approved": false,
  "raw_idea_doc_id": "{raw_idea_doc_id}",
  "target_audience": "Specific target audience description",
  "hook": "Opening hook to grab attention in first 3 seconds",
  "concept": "Detailed concept and storyline",
  "visuals": "Specific visual elements, transitions, and effects",
  "cta": "Call-to-action for engagement",
  "relevance_score": {raw_idea_score},
  "source_url": "{raw_idea_url}",
  "timestamp": "{current_timestamp}"
}}"""
        logger.warning("⚠️ Using default reel generation prompt")
        return default_prompt
    
    def get_reels_per_idea(self) -> int:
        """Get the number of reels to generate per idea."""
        data = self._get_from_firestore("PROMPTS")
        
        if data and "reels_per_idea" in data:
            try:
                return int(data["reels_per_idea"])
            except (ValueError, TypeError):
                logger.warning("⚠️ Invalid reels_per_idea value, using default")
        
        # Default fallback
        return 2