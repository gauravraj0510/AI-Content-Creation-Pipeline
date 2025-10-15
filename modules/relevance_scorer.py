#!/usr/bin/env python3
"""
Relevance Scorer - AI Content Evaluation Module

This module uses Google Gemini LLM to evaluate content relevance for AI influencers
and content creators. It provides a scoring system from 0-100 based on engagement
potential and content quality.

Usage:
    from relevance_scorer import RelevanceScorer
    
    scorer = RelevanceScorer()
    score = scorer.calculate_relevance_score(content_data)
"""

import google.generativeai as genai
import logging
import json
import time
from typing import Dict, Any, Optional
from datetime import datetime, timezone

# Configure logging
logger = logging.getLogger(__name__)

# =============================================================================
# GLOBAL CONFIGURATION VARIABLES
# =============================================================================

# Google Gemini API Configuration
# API key is now configured in main.py only
GEMINI_MODEL = "gemini-2.5-pro"  # Latest supported model for content generation

# Relevance Scoring Configuration
DEFAULT_MIN_SCORE = 0  # Minimum score to consider content relevant
DEFAULT_MAX_RETRIES = 3  # Maximum retries for API calls
RATE_LIMIT_DELAY = 30  # Seconds to wait between API calls (15 calls/minute = 4 seconds)

# Default System Prompt (fallback if none provided)
DEFAULT_SYSTEM_PROMPT = """
You are an expert content evaluator for AI influencers. Rate content from 0-100 based on relevance to AI/tech audiences and content creation potential.

Return ONLY a numeric score from 0-100. No explanations, just the number.

Example: 85
"""

# System prompt is now configured in main.py


class RelevanceScorer:
    """Main class for evaluating content relevance using Google Gemini LLM."""
    
    def __init__(self, api_key: str = None, model: str = None, system_prompt: str = None):
        """Initialize the Relevance Scorer with Gemini API."""
        self.api_key = api_key
        self.model_name = model or GEMINI_MODEL
        self.model = None
        self.min_score = DEFAULT_MIN_SCORE
        self.max_retries = DEFAULT_MAX_RETRIES
        self.rate_limit_delay = RATE_LIMIT_DELAY
        self._api_working = False
        self.system_prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
        
        self._initialize_gemini()
    
    def _initialize_gemini(self):
        """Initialize Google Gemini API connection."""
        try:
            if not self.api_key:
                raise ValueError("Gemini API key not provided. Please pass api_key parameter when initializing RelevanceScorer")
            
            # Configure Gemini API
            genai.configure(api_key=self.api_key)
            
            # Try to initialize the model
            try:
                self.model = genai.GenerativeModel(self.model_name)
                logger.info(f"✅ Gemini API connection initialized successfully with model: {self.model_name}")
            except Exception as model_error:
                logger.warning(f"⚠️  Model {self.model_name} not available, trying alternative models...")
                
                # Try alternative models
                alternative_models = ["gemini-2.5-pro", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"]
                for alt_model in alternative_models:
                    try:
                        self.model = genai.GenerativeModel(alt_model)
                        self.model_name = alt_model
                        logger.info(f"✅ Using alternative model: {alt_model}")
                        break
                    except Exception:
                        continue
                else:
                    # If all models fail, try to list available models
                    try:
                        models = genai.list_models()
                        available_models = [m.name for m in models if 'generateContent' in m.supported_generation_methods]
                        logger.error(f"❌ No supported models found. Available models: {available_models}")
                        raise ValueError(f"No supported Gemini models available. Available models: {available_models}")
                    except Exception as list_error:
                        raise ValueError(f"Failed to initialize any Gemini model. Original error: {model_error}")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Gemini API: {e}")
            raise
    
    def _prepare_content_for_evaluation(self, content_data: Dict[str, Any]) -> str:
        """Prepare minimal content data for LLM evaluation."""
        # Extract only essential information for evaluation
        title = content_data.get('title', 'No Title')
        source_type = content_data.get('source_type', 'unknown')
        
        # For RSS feeds, try multiple possible content field names
        if source_type == 'rss_feed':
            # Array of possible RSS content field names (in order of preference)
            rss_content_fields = ['content', 'description', 'summary', 'excerpt', 'body']
            
            # Find the first available content field
            content_text = title
            for field in rss_content_fields:
                if content_data.get(field) and content_data.get(field).strip():
                    content_text = f"Title: {title}\n\nContent: {content_data.get(field)}"
                    break
            
            # If no content field found, just use title
            if content_text == title:
                content_text = f"Title: {title}"
        
        # For Reddit posts, use content
        elif source_type == 'reddit_post':
            content = content_data.get('content', '')
            content_text = f"Title: {title}\n\nContent: {content}"
        
        # Fallback for other types
        else:
            # Try to find any content field for unknown types
            content_fields = ['content', 'description', 'summary', 'excerpt', 'body']
            content_text = title
            
            for field in content_fields:
                if content_data.get(field) and content_data.get(field).strip():
                    content_text = f"Title: {title}\n\nContent: {content_data.get(field)}"
                    break
            
            if content_text == title:
                content_text = f"Title: {title}"
        
        return content_text
    
    def _call_gemini_api(self, content_text: str) -> Optional[int]:
        """Call Gemini API to get relevance score with rate limiting."""
        try:
            # Rate limiting - wait between API calls
            if hasattr(self, '_last_api_call'):
                time_since_last = time.time() - self._last_api_call
                if time_since_last < self.rate_limit_delay:
                    sleep_time = self.rate_limit_delay - time_since_last
                    logger.debug(f"Rate limiting: waiting {sleep_time:.1f} seconds")
                    time.sleep(sleep_time)
            
            self._last_api_call = time.time()
            
            # Prepare the prompt
            prompt = f"{self.system_prompt}\n\nCONTENT TO EVALUATE:\n\n{content_text}"
            
            # Generate response
            response = self.model.generate_content(prompt)
            
            # Mark API as working
            self._api_working = True
            
            if not response.text:
                logger.warning("Empty response from Gemini API")
                return None
            
            # Extract numeric score
            score_text = response.text.strip()
            
            # Try to extract number from response
            try:
                score = int(score_text)
                if 0 <= score <= 100:
                    return score
                else:
                    logger.warning(f"Score out of range: {score}")
                    return None
            except ValueError:
                # Try to extract number from text
                import re
                numbers = re.findall(r'\b(\d{1,3})\b', score_text)
                if numbers:
                    score = int(numbers[0])
                    if 0 <= score <= 100:
                        return score
                
                logger.warning(f"Could not parse score from response: {score_text}")
                return None
                
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            return None
    
    def calculate_relevance_score(self, content_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate relevance score for content using Gemini LLM."""
        try:
            # Prepare minimal content for evaluation
            content_text = self._prepare_content_for_evaluation(content_data)
            
            # Call Gemini API with retries
            score = None
            for attempt in range(self.max_retries):
                logger.debug(f"Attempting to get relevance score (attempt {attempt + 1}/{self.max_retries})")
                score = self._call_gemini_api(content_text)
                
                if score is not None:
                    break
                
                if attempt < self.max_retries - 1:
                    logger.warning(f"Retrying relevance score calculation (attempt {attempt + 2})")
            
            if score is None:
                logger.error("Failed to get relevance score after all retries - using default fallback score")
                # Return default score for failed attempts
                score = -1  # Easy to detect failed API calls in code
            
            # Determine if content is relevant
            is_relevant = score >= self.min_score
            
            result = {
                "relevance_score": score,
                "is_relevant": is_relevant,
                "evaluation_timestamp": datetime.now(timezone.utc),
                "evaluation_model": self.model_name,
                "evaluation_criteria": {
                    "min_score_threshold": self.min_score,
                    "content_length": len(content_text),
                    "source_type": content_data.get('source_type', 'unknown')
                }
            }
            
            if score == -1:
                logger.warning(f"⚠️  Using fallback score {score} due to API issues (Relevant: {is_relevant})")
            else:
                logger.info(f"📊 Relevance score calculated: {score}/100 (Relevant: {is_relevant})")
            return result
            
        except Exception as e:
            logger.error(f"Error calculating relevance score: {e}")
            # Return default score for errors
            return {
                "relevance_score": -1,
                "is_relevant": False,
                "evaluation_timestamp": datetime.now(timezone.utc),
                "evaluation_model": "error",
                "evaluation_criteria": {
                    "error": str(e),
                    "min_score_threshold": self.min_score
                }
            }
    
    def batch_calculate_scores(self, content_list: list) -> list:
        """Calculate relevance scores for multiple content pieces."""
        results = []
        
        logger.info(f"🔄 Starting batch relevance scoring for {len(content_list)} items")
        
        for i, content_data in enumerate(content_list, 1):
            logger.info(f"📊 Evaluating content {i}/{len(content_list)}: {content_data.get('title', 'No Title')[:50]}...")
            
            score_result = self.calculate_relevance_score(content_data)
            results.append(score_result)
        
        # Summary
        relevant_count = sum(1 for r in results if r.get('is_relevant', False))
        avg_score = sum(r.get('relevance_score', 0) for r in results) / len(results) if results else 0
        
        logger.info(f"📊 Batch scoring completed: {relevant_count}/{len(content_list)} relevant (avg score: {avg_score:.1f})")
        
        return results
    
    def get_scoring_statistics(self, results: list) -> Dict[str, Any]:
        """Get statistics from relevance scoring results."""
        if not results:
            return {}
        
        scores = [r.get('relevance_score', 0) for r in results]
        relevant_count = sum(1 for r in results if r.get('is_relevant', False))
        
        return {
            "total_evaluated": len(results),
            "relevant_count": relevant_count,
            "relevance_rate": (relevant_count / len(results)) * 100,
            "average_score": sum(scores) / len(scores),
            "min_score": min(scores),
            "max_score": max(scores),
            "score_distribution": {
                "excellent_90_100": sum(1 for s in scores if 90 <= s <= 100),
                "good_70_89": sum(1 for s in scores if 70 <= s <= 89),
                "average_50_69": sum(1 for s in scores if 50 <= s <= 69),
                "poor_30_49": sum(1 for s in scores if 30 <= s <= 49),
                "very_poor_0_29": sum(1 for s in scores if 0 <= s <= 29)
            }
        }


class RelevanceScorerRunner:
    """Runner class for relevance scoring operations."""
    
    def __init__(self, api_key: str = None, model: str = None, min_score: int = None):
        """Initialize the relevance scorer runner."""
        self.scorer = RelevanceScorer(api_key=api_key, model=model)
        if min_score is not None:
            self.scorer.min_score = min_score
    
    def score_content(self, content_data: Dict[str, Any]) -> Dict[str, Any]:
        """Score a single piece of content."""
        return self.scorer.calculate_relevance_score(content_data)
    
    def score_content_list(self, content_list: list) -> list:
        """Score multiple pieces of content."""
        return self.scorer.batch_calculate_scores(content_list)
    
    def get_statistics(self, results: list) -> Dict[str, Any]:
        """Get scoring statistics."""
        return self.scorer.get_scoring_statistics(results)
