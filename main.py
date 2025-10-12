#!/usr/bin/env python3
import logging
import signal
from datetime import datetime
from modules.rss_curator import RSSCuratorRunner
from modules.helper import wait_for_next_cycle, signal_handler, get_shutdown_requested

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =============================================================================
# GLOBAL CONFIGURATION VARIABLES
# =============================================================================

# Timing Configuration
INTERVAL_SECONDS = 3600  # 1 hour = 3600 seconds

# RSS Curator Configuration
SERVICE_ACCOUNT_PATH = "service_account.json"
MAX_ITEMS_PER_FEED = 20

# RSS Feed URLs
RSS_FEED_URLS = [
    "https://blog.google/technology/ai/rss/",      # Google AI Blog
    "https://openai.com/blog/rss.xml",             # OpenAI Blog
]


def main():
    """Main entry point."""
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        while not get_shutdown_requested():
            logger.info("🔄 Starting new curation cycle...")
            
            # Create a new runner instance for each cycle
            logger.info("📦 Creating RSS curator runner...")
            runner = RSSCuratorRunner(
                service_account_path=SERVICE_ACCOUNT_PATH,
                max_items_per_feed=MAX_ITEMS_PER_FEED,
                feed_urls=RSS_FEED_URLS
            )
            
            # Run curation cycle once
            logger.info("▶️  Starting curation cycle...")
            runner.start()
            logger.info("✅ Curation cycle completed")
            
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
