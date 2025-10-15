#!/usr/bin/env python3
import signal
from datetime import datetime
from modules.rss_curator import RSSCuratorRunner
from modules.reddit_curator import RedditCuratorRunner
from modules.helper import wait_for_next_cycle, signal_handler, get_shutdown_requested, logger

# =============================================================================
# GLOBAL CONFIGURATION VARIABLES
# =============================================================================

# Timing Configuration
INTERVAL_SECONDS = 3600  # 1 hour = 3600 seconds

# RSS Curator Configuration
SERVICE_ACCOUNT_PATH = "service_account.json"
MAX_ITEMS_PER_FEED = 3

# RSS Feed URLs
RSS_FEED_URLS = [
    "https://techcrunch.com/category/artificial-intelligence/feed/",
    # "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
]

# Reddit Configuration
REDDIT_SUBREDDITS = [
    "AI_Agents",
    # "Marketresearch",
]

# Reddit API Configuration
REDDIT_MAX_POSTS_PER_SUBREDDIT = 3
REDDIT_TIME_FILTER = "hour"  # Options: "hour", "day", "week", "month", "year", "all"

# Gemini AI Configuration (for relevance scoring)
GEMINI_API_KEY = "AIzaSyAfTS3z899jUP8ozrqXR9h6dVkTlFINkQ0"  # Set your Gemini API key here
ENABLE_RELEVANCE_SCORING = True  # Set to False to disable AI relevance scoring


def main():
    """Main entry point."""
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        while not get_shutdown_requested():
            logger.info("🔄 Starting new curation cycle...")
            
            # Create RSS curator runner
            logger.info("📦 Creating RSS curator runner...")
            rss_runner = RSSCuratorRunner(
                service_account_path=SERVICE_ACCOUNT_PATH,
                max_items_per_feed=MAX_ITEMS_PER_FEED,
                feed_urls=RSS_FEED_URLS,
                gemini_api_key=GEMINI_API_KEY,
                enable_relevance_scoring=ENABLE_RELEVANCE_SCORING
            )
            
            # Run RSS curation cycle
            logger.info("▶️  Starting RSS curation cycle...")
            rss_runner.start()
            logger.info("✅ RSS curation cycle completed")
            
            # Create Reddit curator runner
            logger.info("📦 Creating Reddit curator runner...")
            reddit_runner = RedditCuratorRunner(
                service_account_path=SERVICE_ACCOUNT_PATH,
                max_posts_per_subreddit=REDDIT_MAX_POSTS_PER_SUBREDDIT,
                time_filter=REDDIT_TIME_FILTER,
                subreddit_names=REDDIT_SUBREDDITS,
                gemini_api_key=GEMINI_API_KEY,
                enable_relevance_scoring=ENABLE_RELEVANCE_SCORING
            )
            
            # Run Reddit curation cycle
            logger.info("▶️  Starting Reddit curation cycle...")
            reddit_runner.start()
            logger.info("✅ Reddit curation cycle completed")
            
            # Check if shutdown was requested during the cycle
            if get_shutdown_requested():
                logger.info("🛑 Shutdown requested - breaking loop")
                break
            
            # Wait for next cycle
            logger.info("⏳ Waiting for next cycle...")
            wait_for_next_cycle(INTERVAL_SECONDS, get_shutdown_requested)
                
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
    finally:
        logger.info("")
        logger.info("=" * 80)
        logger.info("✅ MAIN RUNNER STOPPED SUCCESSFULLY")
        logger.info("=" * 80)


if __name__ == "__main__":
    main()
