#!/usr/bin/env python3
import signal
import os
from datetime import datetime
from modules.rss_curator import RSSCuratorRunner
from modules.reddit_curator import RedditCuratorRunner
from modules.reel_generator import ReelGeneratorRunner
from modules.helper import wait_for_next_cycle, signal_handler, get_shutdown_requested, logger
from modules.config_manager import ConfigManager

# =============================================================================
# GLOBAL CONFIGURATION VARIABLES
# =============================================================================

# Timing Configuration
INTERVAL_SECONDS = 3600  # 1 hour = 3600 seconds

# RSS Curator Configuration
SERVICE_ACCOUNT_PATH = "service_account.json"
MAX_ITEMS_PER_FEED = 3

# Reddit API Configuration
REDDIT_MAX_POSTS_PER_SUBREDDIT = 3
REDDIT_TIME_FILTER = "hour"  # Options: "hour", "day", "week", "month", "year", "all"

# Gemini AI Configuration (for relevance scoring)
ENABLE_RELEVANCE_SCORING = True  # Set to False to disable AI relevance scoring

# Reel Generator Configuration
REELS_PER_IDEA = 2  # Number of reels to generate per approved raw idea

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
    logger.info("✅ Environment variables loaded from .env file")
except ImportError:
    logger.warning("⚠️  python-dotenv not installed, using system environment variables")
except Exception as e:
    logger.warning(f"⚠️  Failed to load .env file: {e}")

# Initialize configuration manager
config_manager = ConfigManager(service_account_path=SERVICE_ACCOUNT_PATH)


def main():
    """Main entry point."""
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        while not get_shutdown_requested():
            logger.info("🔄 Starting new curation cycle...")
            
            # Get configuration from ConfigManager
            logger.info("📋 Loading configuration...")
            system_prompt = config_manager.get_system_prompt()
            rss_feed_urls = config_manager.get_rss_feed_urls()
            reddit_subreddits = config_manager.get_reddit_subreddits()
            gemini_api_key = config_manager.get_gemini_api_key()
            reddit_client_id = config_manager.get_reddit_client_id()
            reddit_client_secret = config_manager.get_reddit_client_secret()
            reddit_user_agent = config_manager.get_reddit_user_agent()
            
            logger.info(f"📊 Configuration loaded: {len(rss_feed_urls)} RSS feeds, {len(reddit_subreddits)} Reddit subreddits")
            
            # Create RSS curator runner
            logger.info("📦 Creating RSS curator runner...")
            rss_runner = RSSCuratorRunner(
                service_account_path=SERVICE_ACCOUNT_PATH,
                max_items_per_feed=MAX_ITEMS_PER_FEED,
                feed_urls=rss_feed_urls,
                gemini_api_key=gemini_api_key,
                enable_relevance_scoring=ENABLE_RELEVANCE_SCORING,
                system_prompt=system_prompt
            )
            
            # Run RSS curation cycle
            logger.info("▶️  Starting RSS curation cycle...")
            rss_runner.start()
            logger.info("✅ RSS curation cycle completed")
            
            # Create Reddit curator runner
            logger.info("📦 Creating Reddit curator runner...")
            reddit_runner = RedditCuratorRunner(
                service_account_path=SERVICE_ACCOUNT_PATH,
                reddit_client_id=reddit_client_id,
                reddit_client_secret=reddit_client_secret,
                max_posts_per_subreddit=REDDIT_MAX_POSTS_PER_SUBREDDIT,
                time_filter=REDDIT_TIME_FILTER,
                subreddit_names=reddit_subreddits,
                gemini_api_key=gemini_api_key,
                enable_relevance_scoring=ENABLE_RELEVANCE_SCORING,
                system_prompt=system_prompt
            )
            
            # Run Reddit curation cycle
            logger.info("▶️  Starting Reddit curation cycle...")
            reddit_runner.start()
            logger.info("✅ Reddit curation cycle completed")
            
            # Create Reel Generator runner
            logger.info("📦 Creating Reel Generator runner...")
            reel_runner = ReelGeneratorRunner(
                service_account_path=SERVICE_ACCOUNT_PATH,
                gemini_api_key=gemini_api_key,
                reels_per_idea=REELS_PER_IDEA
            )
            
            # Run Reel generation cycle
            logger.info("▶️  Starting Reel generation cycle...")
            reel_result = reel_runner.start()
            logger.info("✅ Reel generation cycle completed")
            
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
