'use client';

import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Plus, Trash2, Edit, Save, X, Settings, Database, MessageSquare } from 'lucide-react';

// Initialize Firebase (using the same config as the auth)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface SettingsData {
  reddit_subreddits: string[];
  rss_feed_urls: string[];
  relevance_score_system_prompt: string;
}

export default function SettingsPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsData>({
    reddit_subreddits: [],
    rss_feed_urls: [],
    relevance_score_system_prompt: ''
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form states
  const [newSubreddit, setNewSubreddit] = useState('');
  const [newRssUrl, setNewRssUrl] = useState('');
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptText, setPromptText] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [user, loading, router]);

  // Load settings from Firestore
  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      try {
        setLoadingSettings(true);
        setError(null);

        // Load SOURCES document
        const sourcesRef = doc(db, 'SETTINGS', 'SOURCES');
        const sourcesDoc = await getDoc(sourcesRef);
        
        // Load PROMPTS document
        const promptsRef = doc(db, 'SETTINGS', 'PROMPTS');
        const promptsDoc = await getDoc(promptsRef);

        const sourcesData = sourcesDoc.exists() ? sourcesDoc.data() : {};
        const promptsData = promptsDoc.exists() ? promptsDoc.data() : {};

        setSettings({
          reddit_subreddits: sourcesData.reddit_subreddits || [],
          rss_feed_urls: sourcesData.rss_feed_urls || [],
          relevance_score_system_prompt: promptsData.relevance_score_system_prompt || ''
        });

        setPromptText(promptsData.relevance_score_system_prompt || '');
      } catch (err) {
        console.error('Error loading settings:', err);
        setError('Failed to load settings. Please try again.');
      } finally {
        setLoadingSettings(false);
      }
    };

    loadSettings();
  }, [user]);

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const addSubreddit = async () => {
    if (!newSubreddit.trim()) return;
    
    try {
      const sourcesRef = doc(db, 'SETTINGS', 'SOURCES');
      await updateDoc(sourcesRef, {
        reddit_subreddits: arrayUnion(newSubreddit.trim())
      });
      
      setSettings(prev => ({
        ...prev,
        reddit_subreddits: [...prev.reddit_subreddits, newSubreddit.trim()]
      }));
      
      setNewSubreddit('');
      showSuccess('Subreddit added successfully!');
    } catch (err) {
      console.error('Error adding subreddit:', err);
      setError('Failed to add subreddit. Please try again.');
    }
  };

  const removeSubreddit = async (subreddit: string) => {
    try {
      const sourcesRef = doc(db, 'SETTINGS', 'SOURCES');
      await updateDoc(sourcesRef, {
        reddit_subreddits: arrayRemove(subreddit)
      });
      
      setSettings(prev => ({
        ...prev,
        reddit_subreddits: prev.reddit_subreddits.filter(s => s !== subreddit)
      }));
      
      showSuccess('Subreddit removed successfully!');
    } catch (err) {
      console.error('Error removing subreddit:', err);
      setError('Failed to remove subreddit. Please try again.');
    }
  };

  const addRssUrl = async () => {
    if (!newRssUrl.trim()) return;
    
    try {
      const sourcesRef = doc(db, 'SETTINGS', 'SOURCES');
      await updateDoc(sourcesRef, {
        rss_feed_urls: arrayUnion(newRssUrl.trim())
      });
      
      setSettings(prev => ({
        ...prev,
        rss_feed_urls: [...prev.rss_feed_urls, newRssUrl.trim()]
      }));
      
      setNewRssUrl('');
      showSuccess('RSS feed URL added successfully!');
    } catch (err) {
      console.error('Error adding RSS URL:', err);
      setError('Failed to add RSS feed URL. Please try again.');
    }
  };

  const removeRssUrl = async (url: string) => {
    try {
      const sourcesRef = doc(db, 'SETTINGS', 'SOURCES');
      await updateDoc(sourcesRef, {
        rss_feed_urls: arrayRemove(url)
      });
      
      setSettings(prev => ({
        ...prev,
        rss_feed_urls: prev.rss_feed_urls.filter(u => u !== url)
      }));
      
      showSuccess('RSS feed URL removed successfully!');
    } catch (err) {
      console.error('Error removing RSS URL:', err);
      setError('Failed to remove RSS feed URL. Please try again.');
    }
  };

  const savePrompt = async () => {
    try {
      const promptsRef = doc(db, 'SETTINGS', 'PROMPTS');
      await updateDoc(promptsRef, {
        relevance_score_system_prompt: promptText
      });
      
      setSettings(prev => ({
        ...prev,
        relevance_score_system_prompt: promptText
      }));
      
      setEditingPrompt(false);
      showSuccess('System prompt updated successfully!');
    } catch (err) {
      console.error('Error saving prompt:', err);
      setError('Failed to save system prompt. Please try again.');
    }
  };

  const cancelEditPrompt = () => {
    setPromptText(settings.relevance_score_system_prompt);
    setEditingPrompt(false);
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
    return null; // Will redirect to sign-in
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 px-2">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Settings</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-300 px-2">
            Manage your data sources and AI prompts
          </p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-red-300 text-sm sm:text-base">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-900/50 border border-green-700 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-green-300 text-sm sm:text-base">{success}</p>
          </div>
        )}

        {loadingSettings ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-300">Loading settings...</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:gap-8">
            {/* Data Sources Section */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4 sm:p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Database className="h-6 w-6 text-blue-400" />
                <h2 className="text-xl sm:text-2xl font-semibold text-white">Data Sources</h2>
              </div>

              {/* Reddit Subreddits */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-300 mb-4">Reddit Subreddits</h3>
                <div className="space-y-3">
                  {settings.reddit_subreddits.map((subreddit, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
                      <span className="text-white font-mono">r/{subreddit}</span>
                      <button
                        onClick={() => removeSubreddit(subreddit)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSubreddit}
                      onChange={(e) => setNewSubreddit(e.target.value)}
                      placeholder="Enter subreddit name (without r/)"
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && addSubreddit()}
                    />
                    <button
                      onClick={addSubreddit}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 font-medium text-sm"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* RSS Feed URLs */}
              <div>
                <h3 className="text-lg font-medium text-gray-300 mb-4">RSS Feed URLs</h3>
                <div className="space-y-3">
                  {settings.rss_feed_urls.map((url, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
                      <span className="text-white text-sm break-all">{url}</span>
                      <button
                        onClick={() => removeRssUrl(url)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-all duration-200 flex-shrink-0 ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newRssUrl}
                      onChange={(e) => setNewRssUrl(e.target.value)}
                      placeholder="Enter RSS feed URL"
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && addRssUrl()}
                    />
                    <button
                      onClick={addRssUrl}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 font-medium text-sm"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Prompts Section */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-4 sm:p-6">
              <div className="flex items-center space-x-3 mb-6">
                <MessageSquare className="h-6 w-6 text-purple-400" />
                <h2 className="text-xl sm:text-2xl font-semibold text-white">AI Prompts</h2>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-300">Relevance Score System Prompt</h3>
                  {!editingPrompt && (
                    <button
                      onClick={() => setEditingPrompt(true)}
                      className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 text-gray-300 hover:text-white rounded-lg transition-all duration-200 text-sm"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {editingPrompt ? (
                  <div className="space-y-4">
                    <textarea
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-vertical"
                      placeholder="Enter the system prompt for relevance scoring..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={savePrompt}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 font-medium text-sm"
                      >
                        <Save className="h-4 w-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={cancelEditPrompt}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg transition-all duration-200 font-medium text-sm"
                      >
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                      {settings.relevance_score_system_prompt || 'No system prompt configured.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
