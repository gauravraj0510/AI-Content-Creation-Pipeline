# AI Content Creation Pipeline

A comprehensive full-stack application that automatically curates content from multiple sources (RSS feeds and Reddit) and stores it in Firestore with AI-powered relevance scoring. Features a modern Next.js frontend for content management and a Python backend for automated content curation. Designed specifically for content creators and AI influencers to discover trending topics and high-quality content leads.

## 🚀 Features

### ✅ **Currently Implemented**

#### **Backend Features**
- **RSS Feed Processing**: Fetch and process RSS feeds with duplicate prevention
- **Reddit Integration**: Fetch posts from multiple subreddits using Reddit API
- **AI Relevance Scoring**: Google Gemini LLM evaluates content relevance (0-100 score)
- **Reel Generation**: AI-powered reel concept generation from approved raw ideas
- **Firestore Integration**: Centralized database storage with metadata tracking
- **Configuration Management**: Dynamic configuration via Firestore and environment variables
- **Smart Retry Logic**: Intelligent rate limit handling with accurate delay extraction
- **Rate Limiting**: Built-in API rate limiting for free tier compliance
- **Duplicate Prevention**: Smart content hashing prevents duplicate storage
- **Modular Architecture**: Clean separation of concerns with reusable modules
- **Comprehensive Logging**: Detailed logging for monitoring and debugging
- **Graceful Shutdown**: Handles Ctrl+C and system signals properly

#### **Frontend Features**
- **Authentication**: Firebase Authentication with protected routes
- **Raw Ideas Management**: View, filter, and approve raw content ideas
- **Reel Ideas Hub**: Browse and manage AI-generated reel concepts
- **Production Pipeline**: Track reel production status and workflow
- **Settings Dashboard**: Configure prompts, data sources, and system parameters
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Real-time Updates**: Live data synchronization with Firestore
- **Advanced Filtering**: Date range filters and search functionality
- **Interactive UI**: Accordion layouts, status badges, and action buttons

### 🔄 **Future Roadmap**
- **X (Twitter) Integration**: Collect tweets and threads from X/Twitter
- **Content Analysis**: Advanced AI-powered sentiment analysis and topic extraction
- **Multi-format Support**: Handle videos, images, and audio content
- **Advanced Filtering**: Smart content filtering based on relevance and quality
- **Web Scraping**: Custom scrapers for specific websites

## 📁 Project Structure

```
AI Content Creation Pipeline/
├── backend/
│   ├── main.py                       # Main entry point with configuration
│   ├── modules/
│   │   ├── __init__.py               # Package initialization
│   │   ├── config_manager.py         # Centralized configuration management
│   │   ├── rss_curator.py            # RSS feed processing module
│   │   ├── reddit_curator.py         # Reddit post processing module
│   │   ├── relevance_scorer.py       # AI relevance scoring with Gemini
│   │   ├── reel_generator.py         # AI reel concept generation
│   │   └── helper.py                 # Utility functions (timing, signals, etc.)
│   ├── service_account.json          # Firebase service account credentials
│   └── requirements.txt              # Python dependencies
├── frontend/                         # Next.js frontend application
│   ├── src/
│   │   ├── app/                      # Next.js 13+ app directory
│   │   │   ├── raw-ideas/            # Raw ideas management page
│   │   │   ├── reel-ideas/           # Reel ideas hub page
│   │   │   ├── production/           # Production pipeline page
│   │   │   ├── settings/             # Settings dashboard page
│   │   │   ├── sign-in/              # Authentication page
│   │   │   ├── layout.tsx            # Root layout component
│   │   │   └── page.tsx              # Home page
│   │   ├── components/               # Reusable React components
│   │   │   └── Navbar.tsx            # Navigation component
│   │   └── lib/                      # Utility libraries
│   │       └── firebase.ts           # Firebase configuration
│   ├── package.json                  # Node.js dependencies
│   └── tailwind.config.js            # Tailwind CSS configuration
└── README.md                         # This documentation
```

## 🛠️ Setup

### 1. Install Dependencies

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Firebase Configuration

**Backend:**
Ensure your `service_account.json` file is in the backend directory. This file contains your Firebase credentials for Firestore access.

**Frontend:**
Create a `.env.local` file in the frontend directory:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Backend Environment Configuration

Create a `.env` file in the backend directory:

```bash
# Gemini AI API Key (for relevance scoring)
GEMINI_API_KEY=your_gemini_api_key_here

# Reddit API Credentials
REDDIT_CLIENT_ID=your_reddit_client_id_here
REDDIT_CLIENT_SECRET=your_reddit_client_secret_here
REDDIT_USER_AGENT=AI Content Creation Pipeline v1.0
```

### 4. Start the Application

**Backend:**
```bash
cd backend
python main.py
```

**Frontend:**
```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000` and the backend will run continuously, processing content every hour.

## 🖥️ Frontend Features

### **Authentication & Navigation**
- **Firebase Authentication**: Secure user authentication with email/password
- **Protected Routes**: All content management pages require authentication
- **Responsive Navbar**: Mobile-friendly navigation with gradient styling

### **Raw Ideas Management (`/raw-ideas`)**
- **Content Overview**: View all curated content with relevance scores
- **Smart Filtering**: Filter by date range (last 24 hours, last 7 days, custom range)
- **Approval System**: Toggle approval status for content to generate reels
- **Score Visualization**: Color-coded relevance scores (75-80 red, 80-90 yellow, 90-100 green)
- **Search Functionality**: Find specific content by title or description

### **Reel Ideas Hub (`/reel-ideas`)**
- **AI-Generated Concepts**: Browse reel concepts generated from approved raw ideas
- **Grouped Display**: Reels grouped by their source raw idea
- **Production Approval**: Toggle approval for production pipeline
- **Date Filtering**: Filter based on raw idea processing date
- **Grid Layout**: 2-column responsive grid for better content organization

### **Production Pipeline (`/production`)**
- **Production Management**: Track reel production status and workflow
- **Status Tracking**: Manage status (pending, scripted, filmed, posted, discarded)
- **Search & Filter**: Find specific reels by title or status
- **Statistics Dashboard**: Overview of production metrics
- **Accordion Interface**: Organized view with expandable sections

### **Settings Dashboard (`/settings`)**
- **Reel Generation Prompt**: Edit the AI prompt for generating reel concepts
- **Relevance Scoring Prompt**: Configure how content is scored for relevance
- **Data Sources Management**: Add/remove RSS feeds and Reddit subreddits
- **Reels Per Idea**: Configure how many reels to generate per approved idea
- **Individual Save Buttons**: Save each section independently
- **Real-time Validation**: Prevent empty data sources and provide visual feedback

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

# Reel Generator Configuration
REELS_PER_IDEA = 2  # Number of reels to generate per approved raw idea
```

### **Firestore Configuration**

The system uses three Firestore collections:

#### **SETTINGS Collection**
- **PROMPTS Document**: Contains:
  - `reel_prompt`: Base prompt template for reel generation
  - `relevance_score_system_prompt`: Prompt for AI relevance evaluation
  - `reels_per_idea`: Number of reels to generate per approved idea
  - `prompt_version`: Version tracking for prompt updates
  - `last_updated`: Timestamp of last configuration update
  - `is_active`: Boolean flag for configuration status

- **SOURCES Document**: Contains:
  - `rss_feed_urls`: Array of RSS feed URLs for content curation
  - `reddit_subreddits`: Array of Reddit subreddit names
  - `last_updated`: Timestamp of last source configuration update

#### **RAW_IDEAS Collection**
Stores all curated content with relevance scores and metadata. Includes:
- `human_approved`: Boolean flag for human approval (toggles reel generation)
- `reel_generated`: Boolean flag indicating if reels have been generated
- `reel_generated_timestamp`: Timestamp when reels were generated
- `relevance_score`: AI-calculated relevance score (0-100)
- `processed_at`: Timestamp when content was processed
- `created_at`: Timestamp when content was first stored

#### **REEL_IDEAS Collection**
Stores AI-generated reel concepts with comprehensive metadata:
- `reel_title`: Title of the generated reel concept
- `production_status`: Current production status (pending, scripted, filmed, posted, discarded)
- `production_approved`: Boolean flag for production approval
- `raw_idea_doc_id`: Reference to the source raw idea
- `target_audience`: Target audience description
- `hook`: Opening hook for the reel
- `concept`: Detailed concept and storyline
- `visuals`: Visual elements and effects
- `cta`: Call-to-action for engagement
- `relevance_score`: Inherited from source raw idea
- `source_url`: Original source URL
- `timestamp`: Generation timestamp

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

## 🎬 AI Reel Generation

### **How It Works**
1. **Approval Detection**: System finds raw ideas with `human_approved = true` and `reel_generated = false`
2. **AI Generation**: Google Gemini LLM creates multiple reel concepts from each approved idea
3. **Structured Output**: Each reel includes title, hook, concept, visuals, CTA, and metadata
4. **Database Storage**: Generated reels saved to `REEL_IDEAS` collection
5. **Status Tracking**: Original raw idea marked as `reel_generated = true`

### **Reel JSON Schema**
```json
{
  "reel_title": "Compelling title for the reel",
  "production_status": "pending",
  "production_approved": false,
  "raw_idea_doc_id": "reference_to_original_idea",
  "target_audience": "Specific target audience description",
  "hook": "Opening hook to grab attention in first 3 seconds",
  "concept": "Detailed concept and storyline",
  "visuals": "Specific visual elements, transitions, and effects",
  "cta": "Call-to-action for engagement",
  "relevance_score": 85,
  "source_url": "original_source_url",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### **Configuration**
- **Reels Per Idea**: Configurable via `REELS_PER_IDEA` (default: 2)
- **Processing Frequency**: Runs hourly as part of main pipeline
- **Smart Retry Logic**: Handles rate limits with accurate delay extraction

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
  "evaluation_model": "gemini-2.5-flash",
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
6. **Reel Generation**: AI generates reel concepts from human-approved raw ideas
7. **Duplicate Prevention**: Content hashing prevents duplicate storage
8. **Cycle Repeat**: Process repeats every hour (configurable)

### **Rate Limiting & API Management**

- **Smart Retry Logic**: Intelligent rate limit handling with accurate delay extraction
- **Gemini API**: Automatic retry with extracted delays (free tier: 2 requests/minute)
- **Reddit API**: Respects Reddit's rate limits
- **Firestore**: Efficient caching reduces database calls
- **Error Handling**: Graceful fallbacks for API failures with retry mechanisms

## 🎯 Use Cases

### **For Content Creators**
- **Automated Discovery**: Discover trending AI/tech topics automatically from RSS feeds and Reddit
- **Pre-scored Content**: Get content leads with AI-calculated relevance scores (0-100)
- **AI Reel Generation**: Generate multiple reel concepts from approved ideas with hooks, CTAs, and visual descriptions
- **Streamlined Workflow**: Manage content approval, reel generation, and production pipeline from one dashboard
- **Time Savings**: Eliminate manual content research and curation processes

### **For AI Influencers**
- **High-Engagement Content**: Find content with viral potential using AI scoring
- **Production-Ready Concepts**: Get complete reel concepts with hooks, storylines, and visual elements
- **Content Pipeline**: Track content from discovery to production with status management
- **Trend Monitoring**: Stay ahead of industry trends with automated content curation
- **Audience Targeting**: Get specific target audience descriptions for each piece of content

### **For Content Teams**
- **Collaborative Workflow**: Multiple team members can approve content and manage production
- **Quality Control**: Review and approve content before reel generation
- **Production Tracking**: Monitor reel production status from script to posting
- **Configuration Management**: Customize AI prompts and data sources without code changes
- **Performance Analytics**: Track content performance and production metrics

### **For Marketers**
- **Competitive Intelligence**: Monitor industry news and competitor content automatically
- **Content Gap Analysis**: Identify trending topics and content opportunities
- **Campaign Planning**: Generate multiple reel concepts for A/B testing
- **ROI Tracking**: Monitor content performance from ideation to publication
- **Scalable Operations**: Automate content discovery and initial concept generation

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
📦 Creating Reel Generator runner...
▶️  Starting Reel generation cycle...
🤖 Generating 2 reels for idea: AI News Article
⏳ Rate limit hit, waiting 59 seconds before retry...
✅ Gemini API request successful on attempt 2, score: 85
✅ Successfully generated 2 reels
✅ Reel generation cycle completed
```

## 🚨 Troubleshooting

### **Backend Issues**

1. **Rate Limit Errors**: System automatically handles with smart retry logic
2. **API Key Errors**: Check backend `.env` file and API key validity
3. **Firestore Errors**: Verify `service_account.json` and permissions
4. **Import Errors**: Run `pip install -r requirements.txt`
5. **Reel Generation Failures**: Check that raw ideas have `human_approved = true`

### **Frontend Issues**

1. **Authentication Errors**: 
   - Verify Firebase configuration in `.env.local`
   - Check Firebase Authentication is enabled in Firebase Console
   - Ensure email/password authentication is enabled

2. **Data Not Loading**:
   - Check Firestore security rules allow authenticated users
   - Verify Firebase project ID matches in both frontend and backend
   - Check browser console for specific error messages

3. **Build Errors**:
   - Run `npm install` to ensure all dependencies are installed
   - Check for TypeScript errors in the console
   - Verify all environment variables are set correctly

4. **Settings Not Saving**:
   - Check Firestore permissions for the SETTINGS collection
   - Verify user is authenticated before accessing settings
   - Check browser console for specific error messages

### **Smart Retry Logic**

The system now automatically handles rate limits by:
- **Extracting Delays**: Parses retry delays from error messages
- **Accurate Timing**: Waits exactly as specified by the API
- **Automatic Retries**: Up to 3 attempts with proper delays
- **Error Classification**: Distinguishes retryable vs non-retryable errors

**Example Error Handling:**
```
Please retry in 54.375050434s. [violations {...}]
⏳ Rate limit hit, waiting 59 seconds before retry...
✅ Gemini API request successful on attempt 2
```

## 🔄 Future Development

### **Phase 1: Enhanced AI Features**
- [x] Custom system prompts for different content types (Settings Dashboard)
- [x] Dynamic prompt configuration via web interface
- [ ] Batch processing for better rate limit utilization
- [ ] Content summarization and key point extraction
- [ ] Multi-language content support

### **Phase 2: Additional Sources**
- [ ] X/Twitter integration
- [ ] LinkedIn article monitoring
- [ ] YouTube video metadata extraction
- [ ] Instagram content monitoring
- [ ] TikTok trend analysis

### **Phase 3: Advanced Analytics**
- [ ] Content performance tracking
- [ ] Trend analysis and prediction
- [ ] Content recommendation engine
- [ ] A/B testing for different prompts
- [ ] Content engagement prediction

### **Phase 4: Enhanced Frontend**
- [ ] Real-time notifications for new content
- [ ] Advanced content analytics dashboard
- [ ] Team collaboration features
- [ ] Content scheduling and publishing
- [ ] Mobile app development

## 📄 License

This project is designed for content creation and research purposes. Please respect the terms of service of all integrated platforms (Reddit, Google Gemini, etc.).

## 🤝 Contributing

Contributions are welcome! Please ensure:
- Code follows the existing modular architecture
- New features include comprehensive logging
- Rate limiting is respected for all APIs
- Configuration remains centralized and flexible