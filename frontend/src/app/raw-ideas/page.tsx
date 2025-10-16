'use client';

import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Check, ExternalLink, Calendar, User, Star, Filter, CheckCircle, ChevronDown, ChevronUp, X } from 'lucide-react';

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

interface RawIdea {
  id: string;
  title: string;
  description: string;
  content?: string;
  link: string;
  source_type: string;
  source_name: string;
  relevance_score: number;
  human_approved: boolean;
  created_at: Timestamp;
  published: Timestamp;
  processed_at: Timestamp;
  author?: string;
  tags?: string[];
}

export default function RawIdeas() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [rawIdeas, setRawIdeas] = useState<RawIdea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
    end: new Date() // now
  });
  const [tempDateRange, setTempDateRange] = useState({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
    end: new Date() // now
  });
  const [isLast24Hours, setIsLast24Hours] = useState(true);
  const [expandedIdeas, setExpandedIdeas] = useState<Set<string>>(new Set());
  
  // Get minimum relevance score from environment variable
  const minRelevanceScore = parseInt(process.env.NEXT_PUBLIC_MIN_RELEVANCE_SCORE || '75', 10);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [user, loading, router]);

  // Set up real-time listener for RAW_IDEAS with relevance score > 75 and date range filter
  useEffect(() => {
    if (!user) return;

    setLoadingIdeas(true);
    setError(null);

    const rawIdeasRef = collection(db, 'RAW_IDEAS');
    // Convert local dates to UTC for Firestore query
    const startUTC = new Date(dateRange.start.getTime() - (dateRange.start.getTimezoneOffset() * 60000));
    const endUTC = new Date(dateRange.end.getTime() - (dateRange.end.getTimezoneOffset() * 60000));
    const startTimestamp = Timestamp.fromDate(startUTC);
    const endTimestamp = Timestamp.fromDate(endUTC);
    
    const q = query(
      rawIdeasRef,
      where('relevance_score', '>', minRelevanceScore),
      where('processed_at', '>=', startTimestamp),
      where('processed_at', '<=', endTimestamp),
      orderBy('processed_at', 'desc')
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const ideas: RawIdea[] = [];
        
        querySnapshot.forEach((doc) => {
          ideas.push({
            id: doc.id,
            ...doc.data()
          } as RawIdea);
        });
        
        setRawIdeas(ideas);
        setLoadingIdeas(false);
        setError(null);
      },
      (err) => {
        console.error('Error listening to raw ideas:', err);
        setError('Failed to load content ideas. Please try again.');
        setLoadingIdeas(false);
      }
    );

    // Cleanup listener on unmount or user change
    return () => unsubscribe();
  }, [user, dateRange, minRelevanceScore]);

  const handleApprove = async (ideaId: string) => {
    try {
      const ideaRef = doc(db, 'RAW_IDEAS', ideaId);
      await updateDoc(ideaRef, {
        human_approved: true
      });
      
      // No need to update local state - real-time listener will handle it
    } catch (err) {
      console.error('Error approving idea:', err);
      setError('Failed to approve content. Please try again.');
    }
  };

  const handleUnapprove = async (ideaId: string) => {
    try {
      const ideaRef = doc(db, 'RAW_IDEAS', ideaId);
      await updateDoc(ideaRef, {
        human_approved: false
      });
      
      // No need to update local state - real-time listener will handle it
    } catch (err) {
      console.error('Error unapproving idea:', err);
      setError('Failed to unapprove content. Please try again.');
    }
  };

  const formatDateTime = (timestamp: Timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate();
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 80) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const handleDateRangeChange = (start: Date, end: Date) => {
    setDateRange({ start, end });
  };

  const handleTempDateRangeChange = (start: Date, end: Date) => {
    setTempDateRange({ start, end });
  };

  const applyDateFilter = () => {
    setDateRange(tempDateRange);
    setIsLast24Hours(false);
    setShowDateFilter(false);
  };

  const resetToLast24Hours = () => {
    const newRange = {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    };
    setDateRange(newRange);
    setTempDateRange(newRange);
    setIsLast24Hours(true);
  };

  const formatDateForInput = (date: Date) => {
    // Format date for datetime-local input (already in local timezone)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const toggleExpanded = (ideaId: string) => {
    setExpandedIdeas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ideaId)) {
        newSet.delete(ideaId);
      } else {
        newSet.add(ideaId);
      }
      return newSet;
    });
  };

  const getDisplayContent = (idea: RawIdea) => {
    const description = idea.description || '';
    const content = idea.content || '';
    
    // If only one exists, return that one
    if (!description && content) return content;
    if (description && !content) return description;
    
    // If both exist, return the longer one
    if (description && content) {
      return description.length >= content.length ? description : content;
    }
    
    // Fallback to description if both are empty
    return description;
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
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 px-2">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Raw Ideas</span> Hub
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-300 mb-3 sm:mb-4 px-2">
            High-quality content ideas with relevance scores above {minRelevanceScore}%
          </p>
          {rawIdeas.length > 0 && (
            <p className="text-xs sm:text-sm text-gray-400 px-2">
              Showing {rawIdeas.length} high-relevance content ideas
            </p>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 text-gray-300 hover:text-white rounded-lg transition-all duration-200 text-sm sm:text-base"
            >
              <Filter className="h-4 w-4" />
              <span>Filter by Date & Time</span>
            </button>
            
            <button
              onClick={resetToLast24Hours}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm sm:text-base ${
                isLast24Hours 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                  : 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 text-gray-300 hover:text-white'
              }`}
            >
              {isLast24Hours && <CheckCircle className="h-4 w-4" />}
              <span>Last 24 Hours</span>
            </button>
          </div>

          {showDateFilter && (
            <div className="mt-4 bg-gray-800/50 border border-gray-700 rounded-2xl p-4 sm:p-6 max-w-2xl mx-auto">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-center">Date Range Filter</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formatDateForInput(tempDateRange.start)}
                    onChange={(e) => {
                      const localDate = new Date(e.target.value);
                      handleTempDateRangeChange(localDate, tempDateRange.end);
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm [color-scheme:dark]"
                    style={{
                      colorScheme: 'dark',
                      backgroundColor: '#374151',
                      color: 'white'
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formatDateForInput(tempDateRange.end)}
                    onChange={(e) => {
                      const localDate = new Date(e.target.value);
                      handleTempDateRangeChange(tempDateRange.start, localDate);
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm [color-scheme:dark]"
                    style={{
                      colorScheme: 'dark',
                      backgroundColor: '#374151',
                      color: 'white'
                    }}
                  />
                </div>
              </div>
              <div className="mt-3 sm:mt-4 text-center">
                <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4 px-2">
                  Currently showing: {formatDateTime(Timestamp.fromDate(dateRange.start))} to {formatDateTime(Timestamp.fromDate(dateRange.end))}
                </p>
                <button
                  onClick={applyDateFilter}
                  className="px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 font-medium text-sm sm:text-base"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-red-300 text-sm sm:text-base">{error}</p>
          </div>
        )}

        {loadingIdeas ? (
          <div className="flex justify-center items-center py-8 sm:py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-400 mx-auto mb-3 sm:mb-4"></div>
              <p className="text-gray-300 text-sm sm:text-base">Loading content ideas...</p>
            </div>
          </div>
        ) : rawIdeas.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto">
              <Star className="h-12 w-12 sm:h-16 sm:w-16 text-gray-600 mx-auto mb-3 sm:mb-4" />
              <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-gray-300">No High-Relevance Content Found</h2>
              <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base px-2">
                No content ideas with relevance scores above {minRelevanceScore}% were found. 
                The AI curation system may still be processing new content.
              </p>
              <div className="space-y-2 sm:space-y-3 text-left">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                  <span className="text-gray-300 text-xs sm:text-sm">Content is automatically curated from RSS feeds and Reddit</span>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0"></div>
                  <span className="text-gray-300 text-xs sm:text-sm">AI scores content based on engagement potential</span>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                  <span className="text-gray-300 text-xs sm:text-sm">Only high-relevance content ({minRelevanceScore}%+) appears here</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {rawIdeas.map((idea) => {
              const isExpanded = expandedIdeas.has(idea.id);
              return (
                <div key={idea.id} className="bg-gray-800/50 border border-gray-700 rounded-2xl hover:border-blue-500/50 transition-all duration-300">
                  {/* Accordion Header - Always Visible */}
                  <div 
                    className="p-3 sm:p-4 cursor-pointer"
                    onClick={() => toggleExpanded(idea.id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2 leading-tight">
                          {idea.title}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-gray-400">
                          <div className="flex items-center space-x-1">
                            <span>{idea.source_name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDateTime(idea.processed_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end sm:space-x-3 sm:ml-4">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getScoreColor(idea.relevance_score)} bg-gray-700/50`}>
                            {idea.relevance_score}%
                          </div>
                          
                          {!idea.human_approved && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(idea.id);
                              }}
                              className="flex items-center justify-center px-2 sm:px-3 py-1 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Approve?
                            </button>
                          )}
                          
                          {idea.human_approved && (
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <div className="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium text-green-400 bg-green-900/30">
                                <span className="hidden sm:inline">Approved</span>
                                <span className="sm:hidden">✓</span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnapprove(idea.id);
                                }}
                                className="flex items-center justify-center px-2 sm:px-3 py-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm"
                              >
                                <X className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Unapprove</span>
                                <span className="sm:hidden">✗</span>
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-1">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Accordion Content - Expandable */}
                  <div className={`overflow-hidden transition-all duration-300 ${
                    isExpanded ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-gray-700/50">
                      <div className="pt-3 sm:pt-4">
                        <p className="text-gray-300 mb-3 sm:mb-4 leading-relaxed text-sm sm:text-base">
                          {getDisplayContent(idea)}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                          {idea.author && (
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span>Author: {idea.author}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                          <a
                            href={idea.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 text-gray-300 hover:text-white rounded-lg transition-all duration-200 text-sm sm:text-base"
                          >
                            <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                            View Source
                          </a>
                          
                          {!idea.human_approved ? (
                            <button
                              onClick={() => handleApprove(idea.id)}
                              className="flex items-center justify-center px-3 sm:px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white rounded-lg transition-all duration-200 font-medium text-sm sm:text-base"
                            >
                              <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                              Approve Content?
                            </button>
                          ) : (
                            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                              <div className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-green-400 bg-green-900/30">
                                ✓ Approved
                              </div>
                              <button
                                onClick={() => handleUnapprove(idea.id)}
                                className="flex items-center justify-center px-3 sm:px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-lg transition-all duration-200 font-medium text-sm sm:text-base"
                              >
                                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                Unapprove Content
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
