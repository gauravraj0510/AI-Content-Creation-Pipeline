"""
Helper utilities for RSS Content Automation.

This module contains utility functions for timing, logging, and other common operations.
"""

import time
import logging
import signal
import sys

logger = logging.getLogger(__name__)

# Global flag for graceful shutdown
shutdown_requested = False

def signal_handler(signum, frame):
    """Handle shutdown signals."""
    global shutdown_requested
    logger.info("")
    logger.info("=" * 80)
    logger.info("⚠️  KEYBOARD INTERRUPT RECEIVED")
    logger.info("=" * 80)
    logger.info("")
    logger.info("🛑 Shutting down gracefully...")
    shutdown_requested = True
    # Force exit if we're stuck
    sys.exit(0)

def get_shutdown_requested():
    """Get the current shutdown requested status."""
    return shutdown_requested

def reset_shutdown_requested():
    """Reset the shutdown requested flag."""
    global shutdown_requested
    shutdown_requested = False


def wait_for_next_cycle(interval_seconds: int, shutdown_check=None):
    """Wait for next cycle with countdown display."""
    if interval_seconds < 60:
        # For short intervals, show simple message
        logger.info("")
        logger.info("=" * 80)
        logger.info(f"⏳ WAITING {interval_seconds} SECONDS FOR NEXT CYCLE")
        logger.info("=" * 80)
        
        for _ in range(interval_seconds):
            if shutdown_check and shutdown_check():
                logger.info("🛑 Shutdown requested during wait - stopping immediately")
                return
            time.sleep(1)
    else:
        # For longer intervals, show countdown
        remaining = interval_seconds
        logger.info("")
        logger.info("=" * 80)
        logger.info("⏳ WAITING FOR NEXT CYCLE")
        logger.info("-" * 80)
        
        while remaining > 0:
            if shutdown_check and shutdown_check():
                logger.info("🛑 Shutdown requested during wait - stopping immediately")
                return
                
            if remaining % 300 == 0 or remaining <= 60:  # Show every 5 minutes or last minute
                hours = remaining // 3600
                minutes = (remaining % 3600) // 60
                seconds = remaining % 60
                
                if hours > 0:
                    time_str = f"{hours}h {minutes}m {seconds}s"
                elif minutes > 0:
                    time_str = f"{minutes}m {seconds}s"
                else:
                    time_str = f"{seconds}s"
                
                logger.info(f"⏰ Next cycle in: {time_str}")
            
            time.sleep(1)
            remaining -= 1
        
        logger.info("=" * 80)
