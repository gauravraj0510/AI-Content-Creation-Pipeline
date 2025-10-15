# AI Content Creation Pipeline

A comprehensive Python application that automatically curates content from multiple sources (RSS feeds and Reddit) and stores it in Firestore with AI-powered relevance scoring. Designed specifically for content creators and AI influencers to discover trending topics and high-quality content leads.

## 🚀 Features

### ✅ **Currently Implemented**
- **RSS Feed Processing**: Fetch and process RSS feeds with duplicate prevention
- **Reddit Integration**: Fetch posts from multiple subreddits using Reddit API
- **AI Relevance Scoring**: Google Gemini LLM evaluates content relevance (0-100 score)
- **Firestore Integration**: Centralized database storage with metadata tracking
- **Configuration Management**: Dynamic configuration via Firestore and environment variables
- **Rate Limiting**: Built-in API rate limiting for free tier compliance
- **Duplicate Prevention**: Smart content hashing prevents duplicate storage
- **Modular Architecture**: Clean separation of concerns with reusable modules
- **Comprehensive Logging**: Detailed logging for monitoring and debugging
- **Graceful Shutdown**: Handles Ctrl+C and system signals properly

### 🔄 **Future Roadmap**
- **X (Twitter) Integration**: Collect tweets and threads from X/Twitter
- **Content Analysis**: Advanced AI-powered sentiment analysis and topic extraction
- **Multi-format Support**: Handle videos, images, and audio content
- **Advanced Filtering**: Smart content filtering based on relevance and quality
- **Web Scraping**: Custom scrapers for specific websites

## 📁 Project Structure

```
AI Content Creation Pipeline/
├── main.py                           # Main entry point with configuration
├── modules/
│   ├── __init__.py                   # Package initialization
│   ├── config_manager.py             # Centralized configuration management
│   ├── rss_curator.py                # RSS feed processing module
│   ├── reddit_curator.py             # Reddit post processing module
│   ├── relevance_scorer.py           # AI relevance scoring with Gemini
│   └── helper.py                     # Utility functions (timing, signals, etc.)
├── service_account.json              # Firebase service account credentials
├── requirements.txt                  # Python dependencies
├── env_template.txt                  # Environment variables template
└── README.md                         # This documentation
```

## 🛠️ Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file from the template:

```bash
cp env_template.txt .env
```

Edit `.env` with your API keys:

```bash
# Gemini AI API Key (for relevance scoring)
GEMINI_API_KEY=your_gemini_api_key_here

# Reddit API Credentials
REDDIT_CLIENT_ID=your_reddit_client_id_here
REDDIT_CLIENT_SECRET=your_reddit_client_secret_here
REDDIT_USER_AGENT=AI Content Creation Pipeline v1.0
```

### 3. Firebase Configuration

Ensure your `service_account.json` file is in the project root. This file contains your Firebase credentials for Firestore access.

### 4. Run Migration (Optional)

Migrate hardcoded configurations to Firestore:

```bash
python migrate_to_firestore.py
```

### 5. Start the Pipeline

```bash
python main.py
```

## 🔧 Configuration

### **Main Configuration (`main.py`)**

```python
# Timing Configuration
INTERVAL_SECONDS = 3600  # 1 hour = 3600 seconds

# RSS Curator Configuration
SERVICE_ACCOUNT_PATH = "service_account.json"
MAX_ITEMS_PER_FEED = 3

# Reddit API Configuration
REDDIT_MAX_POSTS_PER_SUBREDDIT = 3
REDDIT_TIME_FILTER = "hour"  # Options: "hour", "day", "week", "month", "year", "all"

# Gemini AI Configuration
ENABLE_RELEVANCE_SCORING = True  # Set to False to disable AI relevance scoring
```

### **Firestore Configuration**

The system uses two Firestore collections:

#### **SETTINGS Collection**
- **PROMPTS Document**: Contains `relevance_score_system_prompt` for AI evaluation
- **SOURCES Document**: Contains `rss_feed_urls` and `reddit_subreddits` arrays

#### **RAW_IDEAS Collection**
Stores all curated content with relevance scores and metadata.

## 🧠 AI Relevance Scoring

### **How It Works**
1. **Content Evaluation**: Each piece of content is sent to Google Gemini LLM
2. **Scoring Criteria**: 4 key factors (25 points each):
   - **AI/Tech Relevance**: Direct connection to AI, ML, or emerging tech
   - **Engagement Potential**: Controversial topics, tutorials, trending content
   - **Content Creation Value**: Clear narrative, visual opportunities, educational potential
   - **Audience Interest**: Broad appeal, beginner-friendly, industry impact
3. **Score Range**: 0-100 (higher = more relevant for AI influencers)
4. **Rate Limiting**: 35-second delays between API calls (free tier: 2 requests/minute)

### **Scoring Guidelines**
- **90-100**: Exceptional content with viral potential
- **80-89**: High-quality content with strong engagement
- **70-79**: Good content with solid value
- **60-69**: Decent content with some potential
- **50-59**: Average content, may work with good presentation
- **Below 50**: Poor content, limited value
- **-1**: API failure (easy to detect in code)

## 📊 Content Storage Format

### **Standardized JSON Schema**

```json
{
  "id": "a1b2c3d4e5f6789012345678901234567890abcd",
  "title": "The Future of AI in Content Creation",
  "link": "https://example.com/articles/future-ai-content-creation",
  "description": "Explore how AI is revolutionizing content creation...",
  "content": "Full content text...",
  "published": "2024-01-15T14:30:00Z",
  "author": "John Smith",
  "source_type": "rss_feed",
  "source_url": "https://example.com/feed.xml",
  "source_domain": "example.com",
  "source_name": "Tech Blog RSS",
  "tags": ["AI", "Content Creation", "Technology"],
  "content_hash": "a1b2c3d4e5f6789012345678901234567890abcd",
  
  // AI Relevance Scoring
  "relevance_score": 85,
  "is_relevant": true,
  "evaluation_timestamp": "2024-01-15T14:35:00Z",
  "evaluation_model": "gemini-2.5-pro",
  "evaluation_criteria": {
    "min_score_threshold": 0,
    "content_length": 1250,
    "source_type": "rss_feed"
  },
  
  "created_at": "2024-01-15T14:35:00Z",
  "processed_at": "2024-01-15T14:35:00Z"
}
```

### **Source-Specific Formats**

#### **RSS Feed Content**
```json
{
  "source_type": "rss_feed",
  "source_name": "RSS Feed - techcrunch.com",
  "metadata": {
    "rss_feed": {
      "feed_title": "TechCrunch AI",
      "feed_description": "Latest AI news from TechCrunch"
    }
  }
}
```

#### **Reddit Post Content**
```json
{
  "source_type": "reddit_post",
  "source_name": "r/AI_Agents",
  "reddit_metadata": {
    "subreddit": "AI_Agents",
    "post_id": "abc123",
    "score": 1250,
    "upvote_ratio": 0.95,
    "num_comments": 45,
    "is_self": true,
    "url": "https://reddit.com/r/AI_Agents/comments/abc123"
  }
}
```

## 🔄 How It Works

### **Content Processing Flow**

1. **Configuration Loading**: ConfigManager loads settings from Firestore and environment variables
2. **RSS Processing**: Fetches latest items from configured RSS feeds
3. **Reddit Processing**: Fetches latest posts from configured subreddits
4. **AI Evaluation**: Each content piece gets scored by Gemini LLM
5. **Storage**: Content stored in Firestore with relevance scores and metadata
6. **Duplicate Prevention**: Content hashing prevents duplicate storage
7. **Cycle Repeat**: Process repeats every hour (configurable)

### **Rate Limiting & API Management**

- **Gemini API**: 35-second delays (free tier: 2 requests/minute)
- **Reddit API**: Respects Reddit's rate limits
- **Firestore**: Efficient caching reduces database calls
- **Error Handling**: Graceful fallbacks for API failures

## 🎯 Use Cases

### **For Content Creators**
- Discover trending AI/tech topics automatically
- Get pre-scored content leads (0-100 relevance)
- Save time on content research and curation
- Access diverse content sources in one place

### **For AI Influencers**
- Find high-engagement potential content
- Identify controversial or debate-worthy topics
- Discover educational and tutorial opportunities
- Track industry trends and developments

### **For Marketers**
- Monitor competitor content and industry news
- Identify content gaps and opportunities
- Track engagement metrics and trending topics
- Automate content discovery workflows

## 🔧 API Requirements

### **Google Gemini API**
- **Purpose**: AI relevance scoring
- **Rate Limit**: 2 requests/minute (free tier)
- **Setup**: Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### **Reddit API**
- **Purpose**: Fetch Reddit posts
- **Rate Limit**: Respects Reddit's API limits
- **Setup**: Create app at [Reddit App Preferences](https://www.reddit.com/prefs/apps)

### **Firebase/Firestore**
- **Purpose**: Database storage
- **Setup**: Download service account JSON from Firebase Console

## 📈 Monitoring & Logging

The system provides comprehensive logging:

```
🔄 Starting new curation cycle...
📋 Loading configuration...
📊 Configuration loaded: 1 RSS feeds, 1 Reddit subreddits
📦 Creating RSS curator runner...
▶️  Starting RSS curation cycle...
🧠 Calculating relevance score for: AI News Article...
📊 Relevance score calculated: 85/100 (Relevant: True)
📝 Stored new content: AI News Article
✅ RSS curation cycle completed
```

## 🚨 Troubleshooting

### **Common Issues**

1. **Rate Limit Errors**: Increase `RATE_LIMIT_DELAY` in `relevance_scorer.py`
2. **API Key Errors**: Check `.env` file and API key validity
3. **Firestore Errors**: Verify `service_account.json` and permissions
4. **Import Errors**: Run `pip install -r requirements.txt`

### **Rate Limit Solutions**

**Free Tier (2 requests/minute):**
```python
RATE_LIMIT_DELAY = 35  # 35 seconds between calls
```

**Paid Tier (1000 requests/minute):**
```python
RATE_LIMIT_DELAY = 1   # 1 second between calls
```

## 🔄 Future Development

### **Phase 1: Enhanced AI Features**
- [ ] Custom system prompts for different content types
- [ ] Batch processing for better rate limit utilization
- [ ] Content summarization and key point extraction

### **Phase 2: Additional Sources**
- [ ] X/Twitter integration
- [ ] LinkedIn article monitoring
- [ ] YouTube video metadata extraction

### **Phase 3: Advanced Analytics**
- [ ] Content performance tracking
- [ ] Trend analysis and prediction
- [ ] Content recommendation engine

## 📄 License

This project is designed for content creation and research purposes. Please respect the terms of service of all integrated platforms (Reddit, Google Gemini, etc.).

## 🤝 Contributing

Contributions are welcome! Please ensure:
- Code follows the existing modular architecture
- New features include comprehensive logging
- Rate limiting is respected for all APIs
- Configuration remains centralized and flexible