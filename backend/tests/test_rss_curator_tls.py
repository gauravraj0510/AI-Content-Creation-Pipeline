"""TLS handling in RSSFeedCurator.fetch_feed.

A feed whose certificate fails verification must be skipped, never re-fetched
with verification turned off. Runs offline: requests.get is patched.

Run from backend/: python3 -m unittest discover -s tests
"""

import sys
import unittest
from unittest import mock

try:
    import feedparser  # noqa: F401
except ImportError:  # keep the test runnable without the full requirements
    sys.modules["feedparser"] = mock.MagicMock()

import requests

from modules import rss_curator
from modules.rss_curator import RSSFeedCurator


def make_curator():
    """A curator with no Firestore or Gemini connection."""
    curator = object.__new__(RSSFeedCurator)
    curator.max_items_per_feed = 10
    curator.running = True
    curator.enable_relevance_scoring = False
    curator.relevance_scorer = None
    curator._get_RSS_METADATA = mock.MagicMock(return_value={"last_processed": None})
    curator._store_content = mock.MagicMock(return_value=True)
    curator._update_RSS_METADATA = mock.MagicMock()
    return curator


class FetchFeedTlsTest(unittest.TestCase):
    def test_ssl_error_is_not_retried_without_verification(self):
        curator = make_curator()
        ssl_error = requests.exceptions.SSLError("certificate verify failed")
        with mock.patch.object(rss_curator.requests, "get", side_effect=ssl_error) as get, \
                mock.patch.object(rss_curator.feedparser, "parse") as parse:
            result = curator.fetch_feed("https://feed.example.test/rss", 1, 1)

        for call in get.call_args_list:
            self.assertIsNot(call.kwargs.get("verify", True), False,
                             f"requests.get retried with verify=False: {call}")
        self.assertEqual(get.call_count, 1)
        # feedparser.parse(url) would fetch the URL again on its own.
        parse.assert_not_called()
        curator._store_content.assert_not_called()
        curator._update_RSS_METADATA.assert_not_called()
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["new_items"], 0)

    def test_module_does_not_silence_insecure_request_warnings(self):
        source = open(rss_curator.__file__, encoding="utf-8").read()
        self.assertFalse("disable_warnings" in source,
                         "rss_curator silences urllib3 InsecureRequestWarning")
        self.assertFalse("verify=False" in source,
                         "rss_curator makes a request with verify=False")


if __name__ == "__main__":
    unittest.main()
