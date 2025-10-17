'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getFirestore, collection, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import Navbar from '@/components/Navbar';
import { 
  Play, 
  CheckCircle, 
  Clock, 
  Edit3, 
  Save, 
  RotateCcw,
  Calendar,
  Target,
  ExternalLink,
  Video,
  Filter,
  Search,
  X,
  Eye,
  EyeOff,
  Sparkles
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
  created_at: string;
}

interface ProductionReel extends ReelIdea {
  rawIdea: RawIdea;
}

type ProductionStatus = 'pending' | 'scripted' | 'filmed' | 'posted' | 'discarded';

const statusOptions: { value: ProductionStatus; label: string; color: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  { value: 'scripted', label: 'Scripted', color: 'bg-blue-500/20 text-blue-400', icon: Edit3 },
  { value: 'filmed', label: 'Filmed', color: 'bg-purple-500/20 text-purple-400', icon: Video },
  { value: 'posted', label: 'Posted', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  { value: 'discarded', label: 'Discarded', color: 'bg-red-500/20 text-red-400', icon: X },
];

export default function ProductionPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [productionReels, setProductionReels] = useState<ProductionReel[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [editingReel, setEditingReel] = useState<string | null>(null);
  const [editedReel, setEditedReel] = useState<Partial<ReelIdea>>({});
  const [statusFilter, setStatusFilter] = useState<ProductionStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchProductionReels();
    }
  }, [user]);

  // Auto-refresh when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchProductionReels();
      }
    };

    const handleFocus = () => {
      if (user) {
        fetchProductionReels();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  const fetchProductionReels = async () => {
    try {
      setLoadingData(true);
      
      // Fetch ALL approved reel ideas (no date filtering)
      const reelsQuery = query(
        collection(db, 'REEL_IDEAS'), 
        where('production_approved', '==', true),
        orderBy('timestamp', 'desc')
      );
      const reelsSnapshot = await getDocs(reelsQuery);
      const reels: ReelIdea[] = reelsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ReelIdea));

      // Fetch corresponding raw ideas
      const productionReelsWithRawIdeas: ProductionReel[] = [];
      
      for (const reel of reels) {
        try {
          const rawIdeaQuery = query(collection(db, 'RAW_IDEAS'));
          const rawIdeaSnapshot = await getDocs(rawIdeaQuery);
          const rawIdea = rawIdeaSnapshot.docs.find(doc => doc.id === reel.raw_idea_doc_id);
          
          if (rawIdea) {
            productionReelsWithRawIdeas.push({
              ...reel,
              rawIdea: {
                id: rawIdea.id,
                ...rawIdea.data()
              } as RawIdea
            });
          }
        } catch (error) {
          console.error('Error fetching raw idea:', error);
        }
      }

      setProductionReels(productionReelsWithRawIdeas);
    } catch (error) {
      console.error('Error fetching production reels:', error);
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
      
      setProductionReels(prev => prev.map(reel => 
        reel.id === reelId ? { ...reel, ...editedReel } : reel
      ));
      
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

  const updateProductionStatus = async (reelId: string, newStatus: ProductionStatus) => {
    try {
      const reelRef = doc(db, 'REEL_IDEAS', reelId);
      await updateDoc(reelRef, { production_status: newStatus });
      
      setProductionReels(prev => prev.map(reel => 
        reel.id === reelId ? { ...reel, production_status: newStatus } : reel
      ));
    } catch (error) {
      console.error('Error updating production status:', error);
    }
  };

  const toggleGroupExpansion = (rawIdeaId: string) => {
    setExpandedGroup(prev => prev === rawIdeaId ? null : rawIdeaId);
  };

  const formatDate = (dateInput: string | number | Date | { toDate: () => Date } | null | undefined) => {
    try {
      let date: Date;
      
      if (!dateInput) return 'No Date';
      
      // Handle Firestore Timestamp
      if (dateInput && typeof dateInput === 'object' && 'toDate' in dateInput) {
        date = dateInput.toDate();
      }
      // Handle string dates
      else if (typeof dateInput === 'string') {
        date = new Date(dateInput);
      }
      // Handle number timestamps
      else if (typeof dateInput === 'number') {
        date = new Date(dateInput);
      }
      // Handle Date objects
      else if (dateInput instanceof Date) {
        date = dateInput;
      }
      else {
        return 'Invalid Date';
      }
      
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  const getStatusInfo = (status: string) => {
    return statusOptions.find(option => option.value === status) || statusOptions[0];
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (score >= 80) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (score >= 75) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };


  const filteredReels = productionReels.filter(reel => {
    const matchesStatus = statusFilter === 'all' || reel.production_status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      reel.reel_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reel.rawIdea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reel.target_audience.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // No grouping - each reel is its own accordion
  const individualReels = filteredReels;

  // Calculate stats
  const stats = statusOptions.map(option => ({
    ...option,
    count: productionReels.filter(reel => reel.production_status === option.value).length
  }));

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
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Play className="h-8 w-8 text-green-400 mr-3" />
            <h1 className="text-3xl sm:text-4xl font-bold">Production Management</h1>
          </div>
          <p className="text-gray-400 text-lg">
            Manage approved reel ideas through the production pipeline. Track status and progress.
            <span className="block text-sm text-gray-500 mt-1">
              Showing all approved reels • Auto-refreshes when you return to this page
            </span>
          </p>
        </div>

        {/* Stats Boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {stats.map(stat => {
            const IconComponent = stat.icon;
            return (
              <div key={stat.value} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-white">{stat.count}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search reels, raw ideas, or target audience..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProductionStatus | 'all')}
              className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        {loadingData ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          </div>
        ) : individualReels.length === 0 ? (
          <div className="text-center py-12">
            <Play className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No Matching Reels Found' : 'No Approved Reels'}
            </h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Approved reels will appear here once they are approved for production.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {individualReels.map((reel) => {
              const statusInfo = getStatusInfo(reel.production_status);
              return (
                <div key={reel.id} className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden">
                  {/* Accordion Header */}
                  <div 
                    className="p-4 sm:p-6 cursor-pointer hover:bg-gray-700/30 transition-colors"
                    onClick={() => toggleGroupExpansion(reel.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-2">
                          <Sparkles className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
                          <h3 className="text-lg sm:text-xl font-semibold text-white truncate">
                            {reel.reel_title}
                          </h3>
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full border ${getScoreColor(reel.relevance_score)}`}>
                            {reel.relevance_score}
                          </span>
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center">
                            <Target className="h-4 w-4 mr-1" />
                            {reel.target_audience}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(reel.timestamp)}
                          </div>
                          {reel.source_url && (
                            <a 
                              href={reel.source_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center px-3 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-colors"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Source
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        {expandedGroup === reel.id ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Accordion Content */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    expandedGroup === reel.id ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="border-t border-gray-700">
                      <div className="p-4 sm:p-6">
                        <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-4 sm:p-6">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
                            <div className="flex-1 min-w-0 mb-4 lg:mb-0">
                              <div className="flex items-center mb-2">
                                <h3 className="text-lg sm:text-xl font-semibold text-white truncate">
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
                                </h3>
                                <div className="ml-3 flex items-center space-x-2">
                                  <span className={`px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
                                    {statusInfo.label}
                                  </span>
                                  <span className={`px-2 py-1 text-xs rounded-full border ${getScoreColor(reel.relevance_score)}`}>
                                    {reel.relevance_score}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-3">
                                <div className="flex items-center">
                                  <Target className="h-4 w-4 mr-1" />
                                  {reel.target_audience}
                                </div>
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {formatDate(reel.timestamp)}
                                </div>
                                {reel.source_url && (
                                  <a 
                                    href={reel.source_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center px-2 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-colors text-xs"
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Source
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              {/* Status Dropdown */}
                              <select
                                value={reel.production_status}
                                onChange={(e) => updateProductionStatus(reel.id, e.target.value as ProductionStatus)}
                                className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                {statusOptions.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>

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