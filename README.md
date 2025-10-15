# AI Content Automation - Multi-Source Content Curator

A comprehensive Python application that fetches content from multiple sources and stores it in Firestore, designed specifically for curating leads for content creation. Features a clean modular architecture with support for RSS feeds, web scraping, and social media post fetching.

## 🚀 Features

### Current Implementation
- ✅ **RSS Feed Processing**: Fetch and process RSS feeds with duplicate prevention
- ✅ **Modular Architecture**: Clean separation between timing logic and content processing
- ✅ **Global Configuration**: Easy-to-modify global variables for all settings
- ✅ **Customizable Intervals**: Run every minute, hour, or any custom time
- ✅ **Continuous Operation**: Runs until terminated with Ctrl+C
- ✅ **Duplicate Prevention**: Only stores new content, never re-processes existing items
- ✅ **Incremental Updates**: Tracks last processed timestamp for each feed
- ✅ **Firestore Integration**: Uses your service account for secure database access
- ✅ **Graceful Shutdown**: Handles Ctrl+C and system signals properly
- ✅ **Comprehensive Logging**: Detailed logging for monitoring and debugging
- ✅ **Easy Configuration**: No CLI arguments needed, just edit global variables

### Future Roadmap
- 🔄 **Web Scraping**: Custom scrapers for specific websites (no generic solution)
- 🔄 **Reddit Integration**: Fetch posts and comments from Reddit subreddits
- 🔄 **X (Twitter) Integration**: Collect tweets and threads from X/Twitter
- 🔄 **Content Analysis**: AI-powered sentiment analysis and topic extraction
- 🔄 **Multi-format Support**: Handle videos, images, and audio content
- 🔄 **Advanced Filtering**: Smart content filtering based on relevance and quality

## 📁 Project Structure

```
AI Content Automation/
├── main.py                    # Main entry point with timing logic
├── modules/
│   ├── __init__.py           # Package initialization and exports
│   ├── rss_curator.py        # RSS feed processing module
│   └── helper.py             # Utility functions (timing, signals, etc.)
├── service_account.json      # Firebase service account credentials
├── requirements.txt          # Python dependencies
└── README.md                # This documentation
```

### Future Module Structure
```
modules/
├── __init__.py
├── rss_curator.py           # RSS feed processing (current)
├── web_scrapers/            # Custom web scrapers (future)
│   ├── __init__.py
│   ├── techcrunch_scraper.py
│   ├── venturebeat_scraper.py
│   └── custom_site_scraper.py
├── reddit_curator.py        # Reddit post fetching (future)
├── twitter_curator.py       # X/Twitter integration (future)
├── content_analyzer.py      # AI content analysis (future)
└── helper.py                # Shared utilities
```

## 🛠️ Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Service Account Configuration

Your `service_account.json` file is already configured and ready to use. The script will automatically connect to your Firestore database using this service account.

### 3. Firestore Collections

The script creates two collections in your Firestore database:

- **`RAW_IDEAS`**: Stores the actual content from all sources
- **`RSS_METADATA`**: Tracks processing metadata for each source

## 🔧 How It Works

### Current RSS Processing

1. **Content Hashing**: Each RSS item gets a unique hash based on title, link, and description
2. **Timestamp Tracking**: Each feed's last processed timestamp is stored in `RSS_METADATA`
3. **Incremental Processing**: Only items newer than the last processed timestamp are considered
4. **Duplicate Prevention**: Content hash prevents storing duplicate items

### Future Multi-Source Processing

The modular architecture is designed to support multiple content sources:

1. **RSS Feeds** (Current): Standard RSS/Atom feed processing
2. **Web Scraping** (Future): Custom scrapers for specific websites (no generic solution)
3. **Reddit Posts** (Future): Fetch posts and comments from subreddits
4. **X/Twitter** (Future): Collect tweets and threads
5. **Content Analysis** (Future): AI-powered analysis and categorization

### ⚠️ Important Note About Web Scraping

**Web scraping requires custom functions for each website** because:
- Each website has a unique HTML structure and CSS selectors
- Different sites use different content layouts and navigation patterns
- Some sites require JavaScript rendering (Selenium) while others work with static HTML (BeautifulSoup)
- Rate limiting, authentication, and anti-bot measures vary by site
- **No generic function can handle all websites** - each site needs its own custom scraper

## 📋 Standardized JSON Format Specification

This section defines the standardized JSON format for content stored in the `RAW_IDEAS` collection. This format is designed to be extensible for RSS feeds, web scraping, and social media content.

### Core Content Schema

```json
{
  "id": "a1b2c3d4e5f6789012345678901234567890abcd",
  "title": "The Future of AI in Content Creation: A Comprehensive Guide",
  "link": "https://example.com/articles/future-ai-content-creation",
  "description": "Explore how artificial intelligence is revolutionizing content creation, from automated writing to personalized marketing campaigns. This comprehensive guide covers the latest trends, tools, and strategies.",
  "content": "Full article content here... (optional, for web scraping)",
  "published": "2024-01-15T14:30:00Z",
  "author": "John Smith",
  "source_type": "rss_feed",
  "source_url": "https://example.com/feed.xml",
  "source_domain": "example.com",
  "source_name": "Tech Blog",
  "tags": ["AI", "Content Creation", "Marketing", "Technology"],
  "categories": ["Technology", "Business"],
  "language": "en",
  "word_count": 1250,
  "reading_time_minutes": 5,
  "content_hash": "a1b2c3d4e5f6789012345678901234567890abcd",
  "metadata": {
    "rss_feed": {
      "feed_title": "Tech Blog RSS",
      "feed_description": "Latest technology news and insights",
      "feed_language": "en"
    }
  },
  "media": {
    "images": [
      {
        "url": "https://example.com/images/ai-content-creation.jpg",
        "alt_text": "AI content creation illustration",
        "caption": "AI tools transforming content creation"
      }
    ],
    "videos": [],
    "audio": []
  },
  "engagement": {
    "likes": 0,
    "shares": 0,
    "comments": 0,
    "views": 0
  },
  "seo": {
    "meta_title": "Future of AI in Content Creation | Tech Blog",
    "meta_description": "Discover how AI is transforming content creation...",
    "keywords": ["AI", "content creation", "marketing automation"],
    "canonical_url": "https://example.com/articles/future-ai-content-creation"
  },
  "technical": {
    "content_type": "article",
    "format": "html",
    "encoding": "utf-8",
    "last_modified": "2024-01-15T14:30:00Z"
  },
  "created_at": "2024-01-15T14:35:00Z",
  "processed_at": "2024-01-15T14:35:00Z",
  "updated_at": "2024-01-15T14:35:00Z"
}
```

### Field Descriptions

#### Required Fields
- **`id`**: Unique identifier (MD5 hash of title + link + description)
- **`title`**: Article/Content title
- **`link`**: URL to the original content
- **`description`**: Summary or excerpt of the content
- **`published`**: Publication date in ISO 8601 format
- **`source_type`**: Type of source (`rss_feed`, `web_scraping`, `reddit_post`, `twitter_post`, etc.)
- **`source_url`**: URL of the source (RSS feed, website, Reddit post, etc.)
- **`source_domain`**: Domain name of the source
- **`content_hash`**: Hash for duplicate detection
- **`created_at`**: When the record was created
- **`processed_at`**: When the record was last processed

#### Optional Fields
- **`content`**: Full article content (for web scraping)
- **`author`**: Author name
- **`source_name`**: Human-readable source name
- **`tags`**: Array of relevant tags
- **`categories`**: Array of content categories
- **`language`**: Content language (ISO 639-1 code)
- **`word_count`**: Estimated word count
- **`reading_time_minutes`**: Estimated reading time
- **`metadata`**: Source-specific metadata
- **`media`**: Associated media files
- **`engagement`**: Social engagement metrics
- **`seo`**: SEO-related information
- **`technical`**: Technical content information
- **`updated_at`**: Last update timestamp

### Source-Specific Extensions

#### RSS Feed Format (Current)
```json
{
  "id": "a1b2c3d4e5f6789012345678901234567890abcd",
  "title": "Breaking: New AI Model Released",
  "link": "https://example.com/ai-model-release",
  "description": "OpenAI announces the release of their latest AI model...",
  "published": "2024-01-15T14:30:00Z",
  "author": "Tech Reporter",
  "source_type": "rss_feed",
  "source_url": "https://example.com/feed.xml",
  "source_domain": "example.com",
  "source_name": "Tech News RSS",
  "tags": ["AI", "OpenAI", "Technology"],
  "content_hash": "a1b2c3d4e5f6789012345678901234567890abcd",
  "metadata": {
    "rss_feed": {
      "feed_title": "Tech News",
      "feed_description": "Latest technology news",
      "feed_language": "en"
    }
  },
  "created_at": "2024-01-15T14:35:00Z",
  "processed_at": "2024-01-15T14:35:00Z"
}
```

#### Web Scraping Format (Future - Custom Scrapers Required)
```json
{
  "id": "a1b2c3d4e5f6789012345678901234567890abcd",
  "title": "Web Scraped Article Title",
  "link": "https://example.com/article",
  "description": "Article summary extracted from meta tags...",
  "content": "Full article content extracted from HTML...",
  "published": "2024-01-15T14:30:00Z",
  "author": "Article Author",
  "source_type": "web_scraping",
  "source_url": "https://example.com/article",
  "source_domain": "example.com",
  "source_name": "Example Blog",
  "tags": ["Technology", "AI"],
  "word_count": 1250,
  "reading_time_minutes": 5,
  "content_hash": "a1b2c3d4e5f6789012345678901234567890abcd",
  "web_scraping": {
    "scraped_at": "2024-01-15T14:35:00Z",
    "scraper_version": "1.0.0",
    "scraper_name": "techcrunch_scraper",  // Custom scraper used
    "scraping_method": "beautifulsoup",
    "site_specific_selectors": {
      "title": "h1.post-title",
      "content": ".article-content",
      "author": ".author-name"
    },
    "raw_html": "<html>...</html>",
    "extraction_confidence": 0.95
  },
  "content_analysis": {
    "sentiment": "positive",
    "sentiment_score": 0.8,
    "topics": ["AI", "Technology", "Innovation"],
    "entities": [
      {"text": "OpenAI", "type": "ORGANIZATION"},
      {"text": "GPT-4", "type": "PRODUCT"}
    ],
    "keywords": ["artificial intelligence", "content creation", "automation"]
  },
  "created_at": "2024-01-15T14:35:00Z",
  "processed_at": "2024-01-15T14:35:00Z"
}
```

#### Reddit Post Format (Future)
```json
{
  "id": "a1b2c3d4e5f6789012345678901234567890abcd",
  "title": "What do you think about the new AI developments?",
  "link": "https://reddit.com/r/MachineLearning/comments/abc123",
  "description": "User post about AI developments with community discussion...",
  "content": "Full post content and top comments...",
  "published": "2024-01-15T14:30:00Z",
  "author": "reddit_user_123",
  "source_type": "reddit_post",
  "source_url": "https://reddit.com/r/MachineLearning/comments/abc123",
  "source_domain": "reddit.com",
  "source_name": "r/MachineLearning",
  "tags": ["AI", "Machine Learning", "Discussion"],
  "content_hash": "a1b2c3d4e5f6789012345678901234567890abcd",
  "reddit_metadata": {
    "subreddit": "MachineLearning",
    "post_id": "abc123",
    "score": 1250,
    "upvote_ratio": 0.95,
    "num_comments": 45,
    "flair": "Discussion",
    "awards": ["Gold", "Silver"],
    "scraped_at": "2024-01-15T14:35:00Z"
  },
  "engagement": {
    "likes": 1250,
    "shares": 0,
    "comments": 45,
    "views": 0
  },
  "created_at": "2024-01-15T14:35:00Z",
  "processed_at": "2024-01-15T14:35:00Z"
}
```

#### X/Twitter Post Format (Future)
```json
{
  "id": "a1b2c3d4e5f6789012345678901234567890abcd",
  "title": "Exciting news about AI developments! 🚀",
  "link": "https://twitter.com/OpenAI/status/1234567890",
  "description": "Tweet about new AI model release with community reactions...",
  "content": "Full tweet content and thread replies...",
  "published": "2024-01-15T14:30:00Z",
  "author": "OpenAI",
  "source_type": "twitter_post",
  "source_url": "https://twitter.com/OpenAI/status/1234567890",
  "source_domain": "twitter.com",
  "source_name": "@OpenAI",
  "tags": ["AI", "OpenAI", "Technology"],
  "content_hash": "a1b2c3d4e5f6789012345678901234567890abcd",
  "twitter_metadata": {
    "tweet_id": "1234567890",
    "user_id": "OpenAI",
    "retweet_count": 2500,
    "favorite_count": 8500,
    "reply_count": 150,
    "quote_count": 300,
    "is_retweet": false,
    "is_quote_tweet": false,
    "has_media": true,
    "media_types": ["image"],
    "scraped_at": "2024-01-15T14:35:00Z"
  },
  "engagement": {
    "likes": 8500,
    "shares": 2500,
    "comments": 150,
    "views": 0
  },
  "created_at": "2024-01-15T14:35:00Z",
  "processed_at": "2024-01-15T14:35:00Z"
}
```

### Validation Rules

1. **Required Fields**: All required fields must be present and non-empty
2. **Date Format**: All dates must be in ISO 8601 format (UTC)
3. **URLs**: All URL fields must be valid URLs
4. **Hashes**: Content hash must be MD5 format (32 characters)
5. **Arrays**: Tags, categories, and other arrays should not be empty
6. **Language**: Language codes must follow ISO 639-1 standard
7. **Word Count**: Must be positive integers
8. **Confidence Scores**: Must be between 0.0 and 1.0

## 🔄 Future Development Roadmap

### Phase 1: Web Scraping (Next)
- [ ] Custom scraper architecture for individual websites
- [ ] BeautifulSoup-based scrapers for static HTML sites
- [ ] Selenium-based scrapers for JavaScript-heavy sites
- [ ] Site-specific CSS selectors and extraction logic
- [ ] Rate limiting and respectful scraping per site
- [ ] **Note**: Each website requires its own custom scraper function

### Phase 2: Reddit Integration
- [ ] Reddit API integration using PRAW
- [ ] Subreddit monitoring and post fetching
- [ ] Comment thread extraction
- [ ] Reddit-specific metadata handling

### Phase 3: X/Twitter Integration
- [ ] Twitter API v2 integration
- [ ] Tweet and thread collection
- [ ] User timeline monitoring
- [ ] Twitter-specific engagement metrics

### Phase 4: Content Analysis
- [ ] AI-powered sentiment analysis
- [ ] Topic extraction and categorization
- [ ] Content quality scoring
- [ ] Duplicate detection across sources

### Phase 5: Advanced Features
- [ ] Multi-format content support (videos, images, audio)
- [ ] Real-time content streaming
- [ ] Advanced filtering and search
- [ ] Content recommendation engine
