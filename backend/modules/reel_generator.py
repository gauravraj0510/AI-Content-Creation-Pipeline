#!/usr/bin/env python3
"""
Reel Generator Module

This module generates reel ideas from approved raw ideas using Google Gemini LLM.
It processes raw ideas that have been human-approved and generates creative reel concepts.
"""

import firebase_admin
from firebase_admin import credentials, firestore
import google.generativeai as genai
import json
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
import os
import time
import re

logger = logging.getLogger(__name__)

# Configuration
DEFAULT_SERVICE_ACCOUNT_PATH = "service_account.json"
RAW_IDEAS_COLLECTION = "RAW_IDEAS"
REEL_IDEAS_COLLECTION = "REEL_IDEAS"
DEFAULT_REELS_PER_IDEA = 2
MAX_RETRIES = 3
DEFAULT_RETRY_DELAY = 60  # Default delay in seconds if not specified in error


class ReelGenerator:
    """Generates reel ideas from approved raw ideas using Google Gemini LLM."""
    
    def __init__(self, service_account_path: str = None, gemini_api_key: str = None, reels_per_idea: int = None):
        """Initialize the reel generator."""
        self.service_account_path = service_account_path or DEFAULT_SERVICE_ACCOUNT_PATH
        self.gemini_api_key = gemini_api_key
        self.reels_per_idea = reels_per_idea or DEFAULT_REELS_PER_IDEA
        self.db = None
        
        self._initialize_firestore()
        self._initialize_gemini()
    
    def _initialize_firestore(self):
        """Initialize Firestore connection."""
        try:
            # Initialize Firebase Admin SDK
            if not firebase_admin._apps:
                cred = credentials.Certificate(self.service_account_path)
                firebase_admin.initialize_app(cred)
            
            self.db = firestore.client()
            logger.info("✅ Reel Generator: Firestore connection initialized")
        except Exception as e:
            logger.error(f"❌ Reel Generator: Failed to initialize Firestore: {e}")
            raise
    
    def _initialize_gemini(self):
        """Initialize Google Gemini AI."""
        if not self.gemini_api_key:
            logger.error("❌ Gemini API key not provided")
            raise ValueError("Gemini API key is required")
        
        try:
            genai.configure(api_key=self.gemini_api_key)
            self.model = genai.GenerativeModel('gemini-2.5-pro')
            logger.info("✅ Reel Generator: Gemini AI initialized")
        except Exception as e:
            logger.error(f"❌ Reel Generator: Failed to initialize Gemini AI: {e}")
            raise
    
    def get_approved_raw_ideas(self) -> List[Dict[str, Any]]:
        """Get all raw ideas that are human approved but haven't had reels generated yet."""
        try:
            # Query for raw ideas with human_approved = true and reel_generated = false
            query = self.db.collection(RAW_IDEAS_COLLECTION).where(
                "human_approved", "==", True
            ).where(
                "reel_generated", "==", False
            )
            
            docs = query.stream()
            raw_ideas = []
            
            for doc in docs:
                idea_data = doc.to_dict()
                idea_data['doc_id'] = doc.id
                raw_ideas.append(idea_data)
            
            logger.info(f"📋 Found {len(raw_ideas)} approved raw ideas ready for reel generation")
            return raw_ideas
            
        except Exception as e:
            logger.error(f"❌ Failed to fetch approved raw ideas: {e}")
            return []
    
    def generate_reel_prompt(self, raw_idea: Dict[str, Any]) -> str:
        """Generate a comprehensive prompt for creating reel ideas from raw idea."""
        return f"""
You are an expert content creator specializing in viral social media reels. Create {self.reels_per_idea} engaging reel concepts based on the following raw idea.

RAW IDEA DETAILS:
- Title: {raw_idea.get('title', 'N/A')}
- Content: {raw_idea.get('content', 'N/A')}
- Relevance Score: {raw_idea.get('relevance_score', 'N/A')}
- Source URL: {raw_idea.get('source_url', 'N/A')}
- Target Audience: {raw_idea.get('target_audience', 'AI/Tech enthusiasts')}

REQUIREMENTS:
1. Create exactly {self.reels_per_idea} different reel concepts
2. Each reel should be unique and engaging
3. Focus on viral potential and audience engagement
4. Make content suitable for short-form video (15-60 seconds)
5. Include specific visual elements and hooks

OUTPUT FORMAT:
Return a JSON array with {self.reels_per_idea} objects. Each object must have these exact fields:

{{
  "reel_title": "Compelling title for the reel",
  "production_status": "pending",
  "production_approved": false,
  "raw_idea_doc_id": "{raw_idea.get('doc_id', '')}",
  "target_audience": "Specific target audience description",
  "hook": "Opening hook to grab attention in first 3 seconds",
  "concept": "Detailed concept and storyline",
  "visuals": "Specific visual elements, transitions, and effects",
  "cta": "Call-to-action for engagement",
  "relevance_score": {raw_idea.get('relevance_score', 0)},
  "source_url": "{raw_idea.get('source_url', '')}",
  "timestamp": "{datetime.now(timezone.utc).isoformat()}"
}}

Make each reel concept distinct and creative while staying true to the original idea.
"""
    
    def _extract_retry_delay(self, error_message: str) -> int:
        """Extract retry delay from Gemini API error message."""
        try:
            # Look for retry_delay pattern in the error message
            # Example: "Please retry in 49.867907441s" or "retry_delay { seconds: 49 }"
            retry_patterns = [
                r"Please retry in (\d+(?:\.\d+)?)s",  # "Please retry in 49.867907441s"
                r"retry_delay\s*\{\s*seconds:\s*(\d+)",  # "retry_delay { seconds: 49 }"
                r"seconds:\s*(\d+)",  # "seconds: 49"
            ]
            
            for pattern in retry_patterns:
                match = re.search(pattern, error_message, re.IGNORECASE)
                if match:
                    delay = float(match.group(1))
                    # Add a small buffer (5 seconds) to the delay
                    return int(delay) + 5
            
            # If no specific delay found, return default
            logger.warning(f"⚠️  Could not extract retry delay from error message, using default: {DEFAULT_RETRY_DELAY}s")
            return DEFAULT_RETRY_DELAY
            
        except Exception as e:
            logger.warning(f"⚠️  Error extracting retry delay: {e}, using default: {DEFAULT_RETRY_DELAY}s")
            return DEFAULT_RETRY_DELAY
    
    def _make_gemini_request_with_retry(self, prompt: str, raw_idea_title: str) -> Optional[str]:
        """Make Gemini API request with retry logic for rate limits."""
        for attempt in range(MAX_RETRIES):
            try:
                logger.info(f"🤖 Making Gemini API request (attempt {attempt + 1}/{MAX_RETRIES}) for: {raw_idea_title}")
                
                response = self.model.generate_content(prompt)
                
                if response.text:
                    logger.info(f"✅ Gemini API request successful on attempt {attempt + 1}")
                    return response.text
                else:
                    logger.warning(f"⚠️  Empty response from Gemini API on attempt {attempt + 1}")
                    if attempt < MAX_RETRIES - 1:
                        time.sleep(10)  # Wait 10 seconds before retry
                        continue
                    else:
                        logger.error("❌ All retry attempts failed - empty response")
                        return None
                        
            except Exception as e:
                error_message = str(e)
                logger.warning(f"⚠️  Gemini API request failed on attempt {attempt + 1}: {error_message}")
                
                # Check if it's a rate limit error
                if "quota" in error_message.lower() or "retry" in error_message.lower() or "rate" in error_message.lower():
                    if attempt < MAX_RETRIES - 1:
                        # Extract retry delay from error message
                        retry_delay = self._extract_retry_delay(error_message)
                        logger.info(f"⏳ Rate limit hit, waiting {retry_delay} seconds before retry...")
                        time.sleep(retry_delay)
                        continue
                    else:
                        logger.error(f"❌ All retry attempts failed due to rate limits: {error_message}")
                        return None
                else:
                    # Non-rate-limit error, don't retry
                    logger.error(f"❌ Non-retryable error: {error_message}")
                    return None
        
        logger.error("❌ All retry attempts exhausted")
        return None
    
    def generate_reels_for_idea(self, raw_idea: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate reel ideas for a single raw idea using Gemini AI."""
        try:
            prompt = self.generate_reel_prompt(raw_idea)
            
            logger.info(f"🤖 Generating {self.reels_per_idea} reels for idea: {raw_idea.get('title', 'Unknown')}")
            
            # Use the retry method for API calls
            response_text = self._make_gemini_request_with_retry(prompt, raw_idea.get('title', 'Unknown'))
            
            if not response_text:
                logger.error("❌ Failed to get response from Gemini AI after retries")
                return []
            
            # Parse JSON response
            try:
                # Clean the response text (remove markdown formatting if present)
                response_text = response_text.strip()
                if response_text.startswith('```json'):
                    response_text = response_text[7:]
                if response_text.endswith('```'):
                    response_text = response_text[:-3]
                
                reels_data = json.loads(response_text)
                
                # Validate that we got the expected number of reels
                if not isinstance(reels_data, list) or len(reels_data) != self.reels_per_idea:
                    logger.warning(f"⚠️  Expected {self.reels_per_idea} reels, got {len(reels_data) if isinstance(reels_data, list) else 'non-list'}")
                
                logger.info(f"✅ Successfully generated {len(reels_data)} reels")
                return reels_data
                
            except json.JSONDecodeError as e:
                logger.error(f"❌ Failed to parse JSON response from Gemini: {e}")
                logger.error(f"Raw response: {response_text}")
                return []
                
        except Exception as e:
            logger.error(f"❌ Failed to generate reels for idea {raw_idea.get('doc_id', 'unknown')}: {e}")
            return []
    
    def save_reels_to_firestore(self, reels: List[Dict[str, Any]]) -> bool:
        """Save generated reels to Firestore."""
        try:
            if not reels:
                logger.warning("⚠️  No reels to save")
                return False
            
            batch = self.db.batch()
            
            for reel in reels:
                # Create a new document in REEL_IDEAS collection
                doc_ref = self.db.collection(REEL_IDEAS_COLLECTION).document()
                batch.set(doc_ref, reel)
            
            # Commit the batch
            batch.commit()
            
            logger.info(f"✅ Successfully saved {len(reels)} reels to Firestore")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to save reels to Firestore: {e}")
            return False
    
    def mark_raw_idea_as_processed(self, raw_idea_doc_id: str) -> bool:
        """Mark a raw idea as having reels generated."""
        try:
            doc_ref = self.db.collection(RAW_IDEAS_COLLECTION).document(raw_idea_doc_id)
            doc_ref.update({
                "reel_generated": True,
                "reel_generated_timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            logger.info(f"✅ Marked raw idea {raw_idea_doc_id} as processed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to mark raw idea {raw_idea_doc_id} as processed: {e}")
            return False
    
    def process_all_approved_ideas(self) -> Dict[str, Any]:
        """Process all approved raw ideas and generate reels for them."""
        logger.info("🚀 Starting reel generation process...")
        
        # Get all approved raw ideas
        raw_ideas = self.get_approved_raw_ideas()
        
        if not raw_ideas:
            logger.info("ℹ️  No approved raw ideas found for reel generation")
            return {
                "processed_ideas": 0,
                "generated_reels": 0,
                "success": True,
                "message": "No approved raw ideas found"
            }
        
        total_reels_generated = 0
        processed_ideas = 0
        failed_ideas = 0
        
        for raw_idea in raw_ideas:
            try:
                # Generate reels for this idea
                reels = self.generate_reels_for_idea(raw_idea)
                
                if reels:
                    # Save reels to Firestore
                    if self.save_reels_to_firestore(reels):
                        # Mark raw idea as processed
                        if self.mark_raw_idea_as_processed(raw_idea['doc_id']):
                            total_reels_generated += len(reels)
                            processed_ideas += 1
                            logger.info(f"✅ Successfully processed idea: {raw_idea.get('title', 'Unknown')}")
                        else:
                            failed_ideas += 1
                    else:
                        failed_ideas += 1
                else:
                    failed_ideas += 1
                    logger.warning(f"⚠️  Failed to generate reels for idea: {raw_idea.get('title', 'Unknown')}")
                    
            except Exception as e:
                failed_ideas += 1
                logger.error(f"❌ Error processing idea {raw_idea.get('doc_id', 'unknown')}: {e}")
        
        result = {
            "processed_ideas": processed_ideas,
            "failed_ideas": failed_ideas,
            "generated_reels": total_reels_generated,
            "success": processed_ideas > 0,
            "message": f"Processed {processed_ideas} ideas, generated {total_reels_generated} reels"
        }
        
        logger.info(f"🏁 Reel generation process completed: {result['message']}")
        return result


class ReelGeneratorRunner:
    """Runner class for the reel generation process."""
    
    def __init__(self, service_account_path: str = None, gemini_api_key: str = None, reels_per_idea: int = None):
        """Initialize the reel generator runner."""
        self.service_account_path = service_account_path or DEFAULT_SERVICE_ACCOUNT_PATH
        self.gemini_api_key = gemini_api_key
        self.reels_per_idea = reels_per_idea or DEFAULT_REELS_PER_IDEA
        self.generator = None
    
    def start(self):
        """Start the reel generation process."""
        try:
            logger.info("🎬 Starting Reel Generator Runner...")
            
            # Initialize the generator
            self.generator = ReelGenerator(
                service_account_path=self.service_account_path,
                gemini_api_key=self.gemini_api_key,
                reels_per_idea=self.reels_per_idea
            )
            
            # Process all approved ideas
            result = self.generator.process_all_approved_ideas()
            
            if result['success']:
                logger.info(f"✅ Reel generation completed successfully: {result['message']}")
            else:
                logger.warning(f"⚠️  Reel generation completed with issues: {result['message']}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Reel Generator Runner failed: {e}")
            return {
                "processed_ideas": 0,
                "generated_reels": 0,
                "success": False,
                "message": f"Runner failed: {str(e)}"
            }
