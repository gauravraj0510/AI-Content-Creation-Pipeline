'use client';

import { 
  Zap, 
  Target, 
  TrendingUp, 
  Users, 
  BarChart3, 
  Sparkles,
  ArrowRight,
  Brain
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

export default function Home() {
  const [user, loading] = useAuthState(auth);
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-3xl"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-800/50 border border-gray-700 mb-8">
              <Sparkles className="h-4 w-4 text-yellow-400 mr-2" />
              <span className="text-sm text-gray-300">AI-Powered Content Discovery</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Discover
              </span>
              <br />
              <span className="text-white">Viral Content</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Automatically curate high-quality content from RSS feeds and Reddit with AI-powered relevance scoring. 
              Perfect for content creators and AI influencers looking for trending topics.
            </p>
            
            <div className="flex justify-center items-center">
              {loading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              ) : user ? (
                <Link href="/raw-ideas">
                  <button className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold text-lg flex items-center group">
                    View Ideas
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
              ) : (
                <Link href="/sign-in">
                  <button className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold text-lg flex items-center group">
                    Sign In
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Features of <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">ContentLeads</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Our AI-powered pipeline automatically discovers and scores content for maximum engagement potential.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 group">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">AI Relevance Scoring</h3>
              <p className="text-gray-400 leading-relaxed">
                Google Gemini LLM evaluates content with 0-100 relevance scores based on AI/tech relevance, 
                engagement potential, and content creation value.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 hover:border-purple-500/50 transition-all duration-300 group">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Multi-Source Curation</h3>
              <p className="text-gray-400 leading-relaxed">
                Automatically fetch content from RSS feeds and Reddit posts with smart duplicate prevention 
                and comprehensive metadata tracking.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 hover:border-green-500/50 transition-all duration-300 group">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Content Creator Focused</h3>
              <p className="text-gray-400 leading-relaxed">
                Designed specifically for AI influencers and content creators to discover trending topics 
                and high-engagement potential content.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 hover:border-yellow-500/50 transition-all duration-300 group">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Real-time Processing</h3>
              <p className="text-gray-400 leading-relaxed">
                Continuous monitoring with configurable intervals. Process content every hour with 
                built-in rate limiting for optimal API usage.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 hover:border-red-500/50 transition-all duration-300 group">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Smart Analytics</h3>
              <p className="text-gray-400 leading-relaxed">
                Track content performance, relevance trends, and engagement metrics with comprehensive 
                logging and monitoring capabilities.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8 hover:border-indigo-500/50 transition-all duration-300 group">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Team Collaboration</h3>
              <p className="text-gray-400 leading-relaxed">
                Human approval workflows, reel generation tracking, and production management 
                for seamless team collaboration.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gray-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              How <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">It Works</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Our automated pipeline processes content through multiple stages for optimal results.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-3">Content Discovery</h3>
              <p className="text-gray-400 text-sm">
                Automatically fetch latest content from RSS feeds and Reddit subreddits
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-3">AI Evaluation</h3>
              <p className="text-gray-400 text-sm">
                Google Gemini LLM scores content relevance (0-100) based on multiple criteria
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-3">Smart Storage</h3>
              <p className="text-gray-400 text-sm">
                Store content in Firestore with metadata, relevance scores, and duplicate prevention
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">4</span>
              </div>
              <h3 className="text-lg font-semibold mb-3">Content Management</h3>
              <p className="text-gray-400 text-sm">
                Review, approve, and generate reels from high-scoring content
              </p>
            </div>
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer className="border-t border-gray-700 bg-gray-900/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Brain className="h-6 w-6 text-blue-400" />
              <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                ContentLeads
              </span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2024 ContentLeads. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
