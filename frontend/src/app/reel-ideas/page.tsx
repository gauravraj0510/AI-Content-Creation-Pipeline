'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getFirestore, collection, query, orderBy, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import Navbar from '@/components/Navbar';
import { 
  Video, 
  Edit3, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Save, 
  RotateCcw,
  Calendar,
  Target,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Filter,
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

interface ReelIdea {
  id: string;
  reel_title: string;
  production_status: string;
  production_approved: boolean;
  raw_idea_doc_id: string;
  target_audience: string;
  hook: string;
  concept: string;
  visuals: string;
  cta: string;
  relevance_score: number;
  source_url: string;
  timestamp: string;
}

interface RawIdea {
  id: string;
  title: string;
  content: string;
  relevance_score: number;
  source_url: string;
  created_at: string | number | Date | { toDate: () => Date } | null | undefined;
}

interface GroupedReels {
  rawIdea: RawIdea;
  reels: ReelIdea[];
}

export default function ReelIdeasPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [groupedReels, setGroupedReels] = useState<GroupedReels[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [editingReel, setEditingReel] = useState<string | null>(null);
  const [editedReel, setEditedReel] = useState<Partial<ReelIdea>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date() // now
  });
  const [tempDateRange, setTempDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date() // now
  });
  const [isLast7Days, setIsLast7Days] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [user, loading, router]);

  const fetchReelIdeas = useCallback(async () => {
    try {
      setLoadingData(true);
      
      // Fetch all reel ideas
      const allReelsQuery = query(collection(db, 'REEL_IDEAS'), orderBy('timestamp', 'desc'));
      const allReelsSnapshot = await getDocs(allReelsQuery);
      const allReels: ReelIdea[] = allReelsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ReelIdea));
      
      console.log('All reels found:', allReels.length);
      console.log('Date range:', dateRange);
      
      // Group reels by raw_idea_doc_id and filter by raw idea's processed_at
      const groupedMap = new Map<string, GroupedReels>();
      const filteredReels: ReelIdea[] = [];
      
      for (const reel of allReels) {
        if (!groupedMap.has(reel.raw_idea_doc_id)) {
          // Fetch raw idea details
          try {
            const rawIdeaDoc = await getDocs(query(collection(db, 'RAW_IDEAS'), 
              orderBy('created_at', 'desc')));
            const rawIdea = rawIdeaDoc.docs.find(doc => doc.id === reel.raw_idea_doc_id);
            
            if (rawIdea) {
              const rawIdeaData = rawIdea.data();
              let processedAtDate: Date;
              
              // Handle different timestamp formats for processed_at
              if (rawIdeaData.processed_at && typeof rawIdeaData.processed_at === 'object' && 'toDate' in rawIdeaData.processed_at) {
                // Firestore Timestamp
                processedAtDate = rawIdeaData.processed_at.toDate();
              } else if (typeof rawIdeaData.processed_at === 'string') {
                // String timestamp
                processedAtDate = new Date(rawIdeaData.processed_at);
              } else if (typeof rawIdeaData.processed_at === 'number') {
                // Unix timestamp
                processedAtDate = new Date(rawIdeaData.processed_at);
              } else {
                console.log('Unknown processed_at format for raw idea:', rawIdea.id, rawIdeaData.processed_at);
                continue; // Skip this raw idea if we can't parse the date
              }
              
              // Check if raw idea's processed_at is within date range
              const isInRange = processedAtDate >= dateRange.start && processedAtDate <= dateRange.end;
              console.log(`Raw idea ${rawIdea.id}: ${processedAtDate.toISOString()} - In range: ${isInRange}`);
              
              if (isInRange) {
                groupedMap.set(reel.raw_idea_doc_id, {
                  rawIdea: {
                    id: rawIdea.id,
                    ...rawIdeaData
                  } as RawIdea,
                  reels: []
                });
              }
            }
          } catch (error) {
            console.error('Error fetching raw idea:', error);
          }
        }
        
        // Add reel to group if the raw idea is in date range
        const group = groupedMap.get(reel.raw_idea_doc_id);
        if (group) {
          group.reels.push(reel);
          filteredReels.push(reel);
        }
      }
      
      console.log('Filtered reels by raw idea processed_at:', filteredReels.length);

      setGroupedReels(Array.from(groupedMap.values()));
    } catch (error) {
      console.error('Error fetching reel ideas:', error);
    } finally {
      setLoadingData(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (user) {
      fetchReelIdeas();
    }
  }, [user, dateRange, fetchReelIdeas]);

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

  const formatDateForInput = (date: Date) => {
    // Format date for datetime-local input (already in local timezone)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleTempDateRangeChange = (start: Date, end: Date) => {
    setTempDateRange({ start, end });
  };

  const applyDateFilter = () => {
    setDateRange(tempDateRange);
    setIsLast7Days(false);
    setShowDateFilter(false);
  };

  const resetToLast7Days = () => {
    const newRange = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    };
    setDateRange(newRange);
    setTempDateRange(newRange);
    setIsLast7Days(true);
  };

  const handleEdit = (reel: ReelIdea) => {
    setEditingReel(reel.id);
    setEditedReel({ ...reel });
  };

  const handleSave = async (reelId: string) => {
    try {
      const reelRef = doc(db, 'REEL_IDEAS', reelId);
      await updateDoc(reelRef, editedReel);
      
      // Update local state
      setGroupedReels(prev => prev.map(group => ({
        ...group,
        reels: group.reels.map(reel => 
          reel.id === reelId ? { ...reel, ...editedReel } : reel
        )
      })));
      
      setEditingReel(null);
      setEditedReel({});
    } catch (error) {
      console.error('Error updating reel:', error);
    }
  };

  const handleCancel = () => {
    setEditingReel(null);
    setEditedReel({});
  };

  const toggleApproval = async (reelId: string, currentApproval: boolean) => {
    try {
      const reelRef = doc(db, 'REEL_IDEAS', reelId);
      await updateDoc(reelRef, { production_approved: !currentApproval });
      
      // Update local state
      setGroupedReels(prev => prev.map(group => ({
        ...group,
        reels: group.reels.map(reel => 
          reel.id === reelId ? { ...reel, production_approved: !currentApproval } : reel
        )
      })));
    } catch (error) {
      console.error('Error updating approval:', error);
    }
  };

  const toggleGroupExpansion = (rawIdeaId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rawIdeaId)) {
        newSet.delete(rawIdeaId);
      } else {
        newSet.add(rawIdeaId);
      }
      return newSet;
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (score >= 80) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (score >= 75) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const formatDate = (dateInput: string | number | Date | { toDate: () => Date } | null | undefined) => {
    try {
      let date;
      
      // Handle different date formats
      if (dateInput && typeof dateInput === 'object' && 'toDate' in dateInput) {
        // Firestore Timestamp
        date = dateInput.toDate();
      } else if (dateInput && typeof dateInput === 'string') {
        // String date
        date = new Date(dateInput);
      } else if (dateInput && typeof dateInput === 'number') {
        // Unix timestamp
        date = new Date(dateInput);
      } else {
        return 'Unknown';
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 px-2">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Reel Ideas</span> Hub
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-300 mb-3 sm:mb-4 px-2">
            AI-generated reel concepts grouped by original raw ideas
          </p>
          {groupedReels.length > 0 && (
            <p className="text-xs sm:text-sm text-gray-400 px-2">
              Showing {groupedReels.length} grouped reel concepts
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
              onClick={resetToLast7Days}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm sm:text-base ${
                isLast7Days 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600'
              }`}
            >
              {isLast7Days && <CheckCircle className="h-4 w-4" />}
              <span>Last 7 Days</span>
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

        {loadingData ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          </div>
        ) : groupedReels.length === 0 ? (
          <div className="text-center py-12">
            <Video className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No Reel Ideas Found</h3>
            <p className="text-gray-500">Reel ideas will appear here once they are generated from approved raw ideas.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedReels.map((group) => (
              <div key={group.rawIdea.id} className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden">
                {/* Raw Idea Header */}
                <div 
                  className="p-4 sm:p-6 cursor-pointer hover:bg-gray-700/30 transition-colors"
                  onClick={() => toggleGroupExpansion(group.rawIdea.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-2">
                        <Sparkles className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
                        <h3 className="text-lg sm:text-xl font-semibold text-white truncate">
                          {group.rawIdea.title}
                        </h3>
                        <span className="ml-2 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                          {group.reels.length} reel{group.reels.length !== 1 ? 's' : ''}
                        </span>
                        <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                          {group.reels.filter(reel => reel.production_approved).length} approved
                        </span>
                      </div>
                      
                      {/* Reel Titles Preview */}
                      <div className="mb-2">
                        <div className="flex flex-wrap gap-2">
                          {group.reels.slice(0, 2).map((reel, index) => (
                            <span key={reel.id} className="px-2 py-1 bg-gray-600/50 text-gray-300 text-xs rounded-full">
                              {index + 1}. {reel.reel_title}
                            </span>
                          ))}
                          {group.reels.length > 2 && (
                            <span className="px-2 py-1 bg-gray-600/50 text-gray-400 text-xs rounded-full">
                              +{group.reels.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          Score: {group.rawIdea.relevance_score}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(group.rawIdea.created_at)}
                        </div>
                        {group.rawIdea.source_url && (
                          <a 
                            href={group.rawIdea.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center text-blue-400 hover:text-blue-300"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Source
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {expandedGroups.has(group.rawIdea.id) ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Reels List */}
                {expandedGroups.has(group.rawIdea.id) && (
                  <div className="border-t border-gray-700">
                    <div className="p-4 sm:p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {group.reels.map((reel) => (
                        <div key={reel.id} className="bg-gray-700/30 border border-gray-600 rounded-xl p-4 sm:p-6">
                          {/* Title Row */}
                          <div className="mb-3">
                            <h4 className="text-lg font-semibold text-white">
                              {editingReel === reel.id ? (
                                <input
                                  type="text"
                                  value={editedReel.reel_title || ''}
                                  onChange={(e) => setEditedReel(prev => ({ ...prev, reel_title: e.target.value }))}
                                  className="bg-gray-600 border border-gray-500 rounded px-3 py-1 text-white w-full"
                                />
                              ) : (
                                reel.reel_title
                              )}
                            </h4>
                          </div>

                          {/* Badges and Buttons Row */}
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              reel.production_approved 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                              {reel.production_approved ? '✓ Approved' : '⏳ Pending'}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full border ${getScoreColor(reel.relevance_score)}`}>
                              {reel.relevance_score}
                            </span>
                            <div className="flex items-center text-xs text-gray-400">
                              <Target className="h-3 w-3 mr-1" />
                              {reel.target_audience}
                            </div>
                            <div className="flex items-center space-x-2">
                              {reel.production_approved ? (
                                <button
                                  onClick={() => toggleApproval(reel.id, reel.production_approved)}
                                  className="px-3 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 rounded-lg transition-colors text-sm font-medium flex items-center"
                                  title="Unapprove for production"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Disapprove
                                </button>
                              ) : (
                                <button
                                  onClick={() => toggleApproval(reel.id, reel.production_approved)}
                                  className="px-3 py-2 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-lg transition-colors text-sm font-medium flex items-center"
                                  title="Approve for production"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </button>
                              )}
                              {editingReel === reel.id ? (
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => handleSave(reel.id)}
                                    className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors"
                                    title="Save changes"
                                  >
                                    <Save className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    className="p-2 bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 rounded-lg transition-colors"
                                    title="Cancel editing"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleEdit(reel)}
                                  className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
                                  title="Edit reel"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                              <h5 className="font-semibold text-gray-300 mb-2">Hook</h5>
                              {editingReel === reel.id ? (
                                <textarea
                                  value={editedReel.hook || ''}
                                  onChange={(e) => setEditedReel(prev => ({ ...prev, hook: e.target.value }))}
                                  className="bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white w-full h-20 resize-none"
                                />
                              ) : (
                                <p className="text-gray-400 text-sm">{reel.hook}</p>
                              )}
                            </div>
                            <div>
                              <h5 className="font-semibold text-gray-300 mb-2">Concept</h5>
                              {editingReel === reel.id ? (
                                <textarea
                                  value={editedReel.concept || ''}
                                  onChange={(e) => setEditedReel(prev => ({ ...prev, concept: e.target.value }))}
                                  className="bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white w-full h-20 resize-none"
                                />
                              ) : (
                                <p className="text-gray-400 text-sm">{reel.concept}</p>
                              )}
                            </div>
                            <div>
                              <h5 className="font-semibold text-gray-300 mb-2">Visuals</h5>
                              {editingReel === reel.id ? (
                                <textarea
                                  value={editedReel.visuals || ''}
                                  onChange={(e) => setEditedReel(prev => ({ ...prev, visuals: e.target.value }))}
                                  className="bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white w-full h-20 resize-none"
                                />
                              ) : (
                                <p className="text-gray-400 text-sm">{reel.visuals}</p>
                              )}
                            </div>
                            <div>
                              <h5 className="font-semibold text-gray-300 mb-2">Call to Action</h5>
                              {editingReel === reel.id ? (
                                <textarea
                                  value={editedReel.cta || ''}
                                  onChange={(e) => setEditedReel(prev => ({ ...prev, cta: e.target.value }))}
                                  className="bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white w-full h-20 resize-none"
                                />
                              ) : (
                                <p className="text-gray-400 text-sm">{reel.cta}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
