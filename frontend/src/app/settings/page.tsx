'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import Navbar from '@/components/Navbar';
import { 
  Settings, 
  Save, 
  FileText,
  Hash,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

// Initialize Firebase
const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const db = getFirestore(app);

interface PromptSettings {
  reel_prompt: string;
  reels_per_idea: number;
  prompt_version: string;
  last_updated: string;
  is_active: boolean;
}

interface SourceSettings {
  rss_feed_urls: string[];
  reddit_subreddits: string[];
}

interface RelevancePromptSettings {
  relevance_score_system_prompt: string;
}

export default function SettingsPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [settings, setSettings] = useState<PromptSettings>({
    reel_prompt: '',
    reels_per_idea: 2,
    prompt_version: '1.0',
    last_updated: '',
    is_active: true
  });
  const [editedSettings, setEditedSettings] = useState<PromptSettings>({
    reel_prompt: '',
    reels_per_idea: 2,
    prompt_version: '1.0',
    last_updated: '',
    is_active: true
  });
  
  const [sourceSettings, setSourceSettings] = useState<SourceSettings>({
    rss_feed_urls: [],
    reddit_subreddits: []
  });
  const [editedSourceSettings, setEditedSourceSettings] = useState<SourceSettings>({
    rss_feed_urls: [],
    reddit_subreddits: []
  });
  
  const [relevanceSettings, setRelevanceSettings] = useState<RelevancePromptSettings>({
    relevance_score_system_prompt: ''
  });
  const [editedRelevanceSettings, setEditedRelevanceSettings] = useState<RelevancePromptSettings>({
    relevance_score_system_prompt: ''
  });
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState({
    prompts: false,
    sources: false,
    relevance: false
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      setLoadingData(true);
      
      // Fetch PROMPTS settings
      const promptsRef = doc(db, 'SETTINGS', 'PROMPTS');
      const promptsSnap = await getDoc(promptsRef);
      
      if (promptsSnap.exists()) {
        const data = promptsSnap.data();
        const settingsData: PromptSettings = {
          reel_prompt: data.reel_prompt || '',
          reels_per_idea: data.reels_per_idea || 2,
          prompt_version: data.prompt_version || '1.0',
          last_updated: data.last_updated || '',
          is_active: data.is_active !== false
        };
        setSettings(settingsData);
        setEditedSettings(settingsData);
      } else {
        // Use default values if document doesn't exist
        const defaultSettings: PromptSettings = {
          reel_prompt: `You are an expert content creator specializing in viral social media reels. Create engaging reel concepts based on the following raw idea.

REQUIREMENTS:
1. Create exactly {reels_per_idea} different reel concepts
2. Each reel should be unique and engaging
3. Focus on viral potential and audience engagement
4. Make content suitable for short-form video (15-60 seconds)
5. Include specific visual elements and hooks
6. Ensure each concept is distinct and creative while staying true to the original idea

OUTPUT FORMAT:
Return a JSON array with {reels_per_idea} objects. Each object must have these exact fields:

{
  "reel_title": "Compelling title for the reel",
  "production_status": "pending",
  "production_approved": false,
  "raw_idea_doc_id": "{raw_idea_doc_id}",
  "target_audience": "Specific target audience description",
  "hook": "Opening hook to grab attention in first 3 seconds",
  "concept": "Detailed concept and storyline",
  "visuals": "Specific visual elements, transitions, and effects",
  "cta": "Call-to-action for engagement",
  "relevance_score": {raw_idea_score},
  "source_url": "{raw_idea_url}",
  "timestamp": "{current_timestamp}"
}`,
          reels_per_idea: 2,
          prompt_version: '1.0',
          last_updated: new Date().toISOString(),
          is_active: true
        };
        setSettings(defaultSettings);
        setEditedSettings(defaultSettings);
      }

      // Fetch SOURCES settings
      const sourcesRef = doc(db, 'SETTINGS', 'SOURCES');
      const sourcesSnap = await getDoc(sourcesRef);
      
      if (sourcesSnap.exists()) {
        const data = sourcesSnap.data();
        const sourceData: SourceSettings = {
          rss_feed_urls: data.rss_feed_urls || [],
          reddit_subreddits: data.reddit_subreddits || []
        };
        setSourceSettings(sourceData);
        setEditedSourceSettings(sourceData);
      } else {
        // Use default values
        const defaultSourceSettings: SourceSettings = {
          rss_feed_urls: [
            'https://feeds.feedburner.com/oreilly/radar',
            'https://techcrunch.com/feed/',
            'https://www.wired.com/feed/rss'
          ],
          reddit_subreddits: [
            'artificial',
            'MachineLearning',
            'ChatGPT',
            'OpenAI',
            'technology'
          ]
        };
        setSourceSettings(defaultSourceSettings);
        setEditedSourceSettings(defaultSourceSettings);
      }

      // Fetch relevance prompt from PROMPTS document
      if (promptsSnap.exists()) {
        const data = promptsSnap.data();
        const relevanceData: RelevancePromptSettings = {
          relevance_score_system_prompt: data.relevance_score_system_prompt || ''
        };
        setRelevanceSettings(relevanceData);
        setEditedRelevanceSettings(relevanceData);
      } else {
        // Use default relevance prompt
        const defaultRelevanceSettings: RelevancePromptSettings = {
          relevance_score_system_prompt: `You are an expert content curator and relevance scorer. Your task is to evaluate how relevant and valuable a piece of content would be for creating engaging social media content, specifically reels and short-form videos.

EVALUATION CRITERIA:
1. **Viral Potential** (25%): How likely is this content to go viral or generate high engagement?
2. **Educational Value** (25%): Does this content teach something valuable or provide actionable insights?
3. **Entertainment Factor** (20%): Is this content entertaining, engaging, or emotionally compelling?
4. **Timeliness** (15%): Is this content current, trending, or evergreen?
5. **Visual Appeal** (15%): Can this content be made visually interesting for video format?

SCORING SCALE:
- 90-100: Exceptional content with high viral potential
- 80-89: Very good content, likely to perform well
- 70-79: Good content with solid potential
- 60-69: Average content, may need creative enhancement
- Below 60: Low potential, not recommended

OUTPUT FORMAT:
Provide a JSON response with:
{
  "relevance_score": [score from 0-100],
  "reasoning": "Brief explanation of the score",
  "target_audience": "Primary audience who would find this valuable",
  "content_type": "Type of content (tutorial, news, entertainment, etc.)"
}`
        };
        setRelevanceSettings(defaultRelevanceSettings);
        setEditedRelevanceSettings(defaultRelevanceSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoadingData(false);
    }
  };

  const handleSavePrompts = async () => {
    try {
      setSaving(prev => ({ ...prev, prompts: true }));
      setMessage(null);
      
      const promptsRef = doc(db, 'SETTINGS', 'PROMPTS');
      const updatedPromptSettings = {
        ...editedSettings,
        last_updated: new Date().toISOString(),
        prompt_version: (parseFloat(editedSettings.prompt_version) + 0.1).toFixed(1)
      };
      
      await setDoc(promptsRef, updatedPromptSettings);
      
      setSettings(updatedPromptSettings);
      setMessage({ type: 'success', text: 'Reel settings saved successfully!' });
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving prompts:', error);
      setMessage({ type: 'error', text: 'Failed to save reel settings' });
    } finally {
      setSaving(prev => ({ ...prev, prompts: false }));
    }
  };

  const handleSaveRelevance = async () => {
    try {
      setSaving(prev => ({ ...prev, relevance: true }));
      setMessage(null);
      
      const promptsRef = doc(db, 'SETTINGS', 'PROMPTS');
      const updatedRelevanceSettings = {
        relevance_score_system_prompt: editedRelevanceSettings.relevance_score_system_prompt,
        last_updated: new Date().toISOString()
      };
      
      await setDoc(promptsRef, updatedRelevanceSettings, { merge: true });
      
      setRelevanceSettings(editedRelevanceSettings);
      setMessage({ type: 'success', text: 'Relevance prompt saved successfully!' });
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving relevance prompt:', error);
      setMessage({ type: 'error', text: 'Failed to save relevance prompt' });
    } finally {
      setSaving(prev => ({ ...prev, relevance: false }));
    }
  };

  const handleSaveSources = async () => {
    try {
      setSaving(prev => ({ ...prev, sources: true }));
      setMessage(null);
      
      const sourcesRef = doc(db, 'SETTINGS', 'SOURCES');
      const filteredSourceSettings = {
        rss_feed_urls: editedSourceSettings.rss_feed_urls.filter(url => url.trim() !== ''),
        reddit_subreddits: editedSourceSettings.reddit_subreddits.filter(sub => sub.trim() !== ''),
        last_updated: new Date().toISOString()
      };
      
      await setDoc(sourcesRef, filteredSourceSettings);
      
      setSourceSettings(filteredSourceSettings);
      setEditedSourceSettings(filteredSourceSettings);
      setMessage({ type: 'success', text: 'Data sources saved successfully!' });
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving sources:', error);
      setMessage({ type: 'error', text: 'Failed to save data sources' });
    } finally {
      setSaving(prev => ({ ...prev, sources: false }));
    }
  };


  const hasChanges = {
    prompts: JSON.stringify(settings) !== JSON.stringify(editedSettings),
    sources: JSON.stringify(sourceSettings) !== JSON.stringify(editedSourceSettings),
    relevance: JSON.stringify(relevanceSettings) !== JSON.stringify(editedRelevanceSettings)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 px-2">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Settings</span> Hub
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-300 mb-3 sm:mb-4 px-2">
            Configure reel generation prompts and parameters
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${
            message.type === 'success' 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            {message.text}
          </div>
        )}

        {loadingData ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Reels Per Idea Setting */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <Hash className="h-6 w-6 text-blue-400 mr-3" />
                <h2 className="text-xl font-semibold">Reels Per Idea</h2>
              </div>
              <p className="text-gray-400 mb-4">
                Number of reel concepts to generate for each raw idea
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editedSettings.reels_per_idea}
                    onChange={(e) => setEditedSettings(prev => ({ 
                      ...prev, 
                      reels_per_idea: parseInt(e.target.value) || 2 
                    }))}
                    className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-400">reels per idea</span>
                </div>
                <button
                  onClick={handleSavePrompts}
                  disabled={!hasChanges.prompts || saving.prompts}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium"
                >
                  {saving.prompts ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving.prompts ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            {/* Reel Prompt Setting */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <FileText className="h-6 w-6 text-blue-400 mr-3" />
                <h2 className="text-xl font-semibold">Reel Generation Prompt</h2>
              </div>
              
              <p className="text-gray-400 mb-4">
                Base prompt template for generating reel concepts. Use template variables like {'{reels_per_idea}'}, {'{raw_idea_doc_id}'}, etc.
              </p>

              {/* Template Variables Guide */}
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-400 mb-2">Available Template Variables:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-300">
                  <code className="bg-gray-700 px-2 py-1 rounded">{'{reels_per_idea}'}</code>
                  <code className="bg-gray-700 px-2 py-1 rounded">{'{raw_idea_doc_id}'}</code>
                  <code className="bg-gray-700 px-2 py-1 rounded">{'{raw_idea_score}'}</code>
                  <code className="bg-gray-700 px-2 py-1 rounded">{'{raw_idea_url}'}</code>
                  <code className="bg-gray-700 px-2 py-1 rounded">{'{current_timestamp}'}</code>
                </div>
              </div>

              <textarea
                value={editedSettings.reel_prompt}
                onChange={(e) => setEditedSettings(prev => ({ 
                  ...prev, 
                  reel_prompt: e.target.value 
                }))}
                className="w-full h-96 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
                placeholder="Enter your reel generation prompt template..."
              />
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSavePrompts}
                  disabled={!hasChanges.prompts || saving.prompts}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium"
                >
                  {saving.prompts ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving.prompts ? 'Saving...' : 'Save Reel Prompt'}
                </button>
              </div>

            </div>

            {/* Relevance Score Prompt Setting */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <FileText className="h-6 w-6 text-green-400 mr-3" />
                <h2 className="text-xl font-semibold">Relevance Score Prompt</h2>
              </div>
              
              <p className="text-gray-400 mb-4">
                System prompt for evaluating content relevance and scoring (0-100). This prompt determines how raw ideas are scored for viral potential.
              </p>

              <textarea
                value={editedRelevanceSettings.relevance_score_system_prompt}
                onChange={(e) => setEditedRelevanceSettings(prev => ({ 
                  ...prev, 
                  relevance_score_system_prompt: e.target.value 
                }))}
                className="w-full h-64 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none font-mono text-sm"
                placeholder="Enter your relevance scoring prompt..."
              />
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSaveRelevance}
                  disabled={!hasChanges.relevance || saving.relevance}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium"
                >
                  {saving.relevance ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving.relevance ? 'Saving...' : 'Save Relevance Prompt'}
                </button>
              </div>
            </div>

            {/* Data Sources Settings */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6">
              <div className="flex items-center mb-4">
                <Settings className="h-6 w-6 text-purple-400 mr-3" />
                <h2 className="text-xl font-semibold">Data Sources</h2>
              </div>
              
              <p className="text-gray-400 mb-6">
                Configure RSS feeds and Reddit subreddits for content curation
              </p>

              {/* RSS Feeds */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-blue-400">RSS Feed URLs</h3>
                <div className="space-y-3">
                  {editedSourceSettings.rss_feed_urls.map((url, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => {
                          const newUrls = [...editedSourceSettings.rss_feed_urls];
                          newUrls[index] = e.target.value;
                          setEditedSourceSettings(prev => ({ ...prev, rss_feed_urls: newUrls }));
                        }}
                        onBlur={(e) => {
                          // Remove empty URLs on blur
                          if (e.target.value.trim() === '') {
                            const newUrls = editedSourceSettings.rss_feed_urls.filter((_, i) => i !== index);
                            setEditedSourceSettings(prev => ({ ...prev, rss_feed_urls: newUrls }));
                          }
                        }}
                        className={`flex-1 px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                          url.trim() === '' 
                            ? 'border-red-500/50 focus:ring-red-500' 
                            : 'border-gray-600 focus:ring-blue-500'
                        }`}
                        placeholder="https://example.com/feed.xml"
                      />
                      <button
                        onClick={() => {
                          const newUrls = editedSourceSettings.rss_feed_urls.filter((_, i) => i !== index);
                          setEditedSourceSettings(prev => ({ ...prev, rss_feed_urls: newUrls }));
                        }}
                        className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditedSourceSettings(prev => ({ 
                        ...prev, 
                        rss_feed_urls: [...prev.rss_feed_urls, ''] 
                      }));
                    }}
                    className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg transition-colors"
                  >
                    + Add RSS Feed
                  </button>
                </div>
              </div>

              {/* Reddit Subreddits */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-orange-400">Reddit Subreddits</h3>
                <div className="space-y-3">
                  {editedSourceSettings.reddit_subreddits.map((subreddit, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <span className="text-gray-400">r/</span>
                      <input
                        type="text"
                        value={subreddit}
                        onChange={(e) => {
                          const newSubreddits = [...editedSourceSettings.reddit_subreddits];
                          newSubreddits[index] = e.target.value;
                          setEditedSourceSettings(prev => ({ ...prev, reddit_subreddits: newSubreddits }));
                        }}
                        onBlur={(e) => {
                          // Remove empty subreddits on blur
                          if (e.target.value.trim() === '') {
                            const newSubreddits = editedSourceSettings.reddit_subreddits.filter((_, i) => i !== index);
                            setEditedSourceSettings(prev => ({ ...prev, reddit_subreddits: newSubreddits }));
                          }
                        }}
                        className={`flex-1 px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                          subreddit.trim() === '' 
                            ? 'border-red-500/50 focus:ring-red-500' 
                            : 'border-gray-600 focus:ring-orange-500'
                        }`}
                        placeholder="MachineLearning"
                      />
                      <button
                        onClick={() => {
                          const newSubreddits = editedSourceSettings.reddit_subreddits.filter((_, i) => i !== index);
                          setEditedSourceSettings(prev => ({ ...prev, reddit_subreddits: newSubreddits }));
                        }}
                        className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditedSourceSettings(prev => ({ 
                        ...prev, 
                        reddit_subreddits: [...prev.reddit_subreddits, ''] 
                      }));
                    }}
                    className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 rounded-lg transition-colors"
                  >
                    + Add Subreddit
                  </button>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveSources}
                  disabled={!hasChanges.sources || saving.sources}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium"
                >
                  {saving.sources ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving.sources ? 'Saving...' : 'Save Data Sources'}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}