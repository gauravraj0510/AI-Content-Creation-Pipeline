'use client';

import { useState, useEffect } from 'react';
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
  TrendingUp
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
  created_at: any; // Can be string, Timestamp, or number
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

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchReelIdeas();
    }
  }, [user]);

  const fetchReelIdeas = async () => {
    try {
      setLoadingData(true);
      
      // Fetch reel ideas
      const reelsQuery = query(collection(db, 'REEL_IDEAS'), orderBy('timestamp', 'desc'));
      const reelsSnapshot = await getDocs(reelsQuery);
      const reels: ReelIdea[] = reelsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ReelIdea));

      // Group reels by raw_idea_doc_id
      const groupedMap = new Map<string, GroupedReels>();
      
      for (const reel of reels) {
        if (!groupedMap.has(reel.raw_idea_doc_id)) {
          // Fetch raw idea details
          try {
            const rawIdeaDoc = await getDocs(query(collection(db, 'RAW_IDEAS'), 
              orderBy('created_at', 'desc')));
            const rawIdea = rawIdeaDoc.docs.find(doc => doc.id === reel.raw_idea_doc_id);
            
            if (rawIdea) {
              groupedMap.set(reel.raw_idea_doc_id, {
                rawIdea: {
                  id: rawIdea.id,
                  ...rawIdea.data()
                } as RawIdea,
                reels: []
              });
            }
          } catch (error) {
            console.error('Error fetching raw idea:', error);
          }
        }
        
        const group = groupedMap.get(reel.raw_idea_doc_id);
        if (group) {
          group.reels.push(reel);
        }
      }

      setGroupedReels(Array.from(groupedMap.values()));
    } catch (error) {
      console.error('Error fetching reel ideas:', error);
    } finally {
      setLoadingData(false);
    }
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

  const formatDate = (dateInput: any) => {
    try {
      let date;
      
      // Handle different date formats
      if (dateInput && typeof dateInput === 'object' && dateInput.toDate) {
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
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Video className="h-8 w-8 text-blue-400 mr-3" />
            <h1 className="text-3xl sm:text-4xl font-bold">Reel Ideas</h1>
          </div>
          <p className="text-gray-400 text-lg">
            AI-generated reel concepts grouped by original raw ideas. Edit and approve reels for production.
          </p>
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
                    <div className="p-4 sm:p-6 space-y-4">
                      {group.reels.map((reel) => (
                        <div key={reel.id} className="bg-gray-700/30 border border-gray-600 rounded-xl p-4 sm:p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center mb-2">
                                <h4 className="text-lg font-semibold text-white truncate">
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
                            <div className="ml-3 flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                reel.production_approved 
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                              }`}>
                                {reel.production_approved ? '✓ Approved' : '⏳ Pending'}
                              </span>
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                                {reel.relevance_score}
                              </span>
                            </div>
                              </div>
                              <div className="flex items-center text-sm text-gray-400 mb-3">
                                <Target className="h-4 w-4 mr-1" />
                                {reel.target_audience}
                              </div>
                            </div>
                            <div className="ml-4 flex items-center space-x-2">
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
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
