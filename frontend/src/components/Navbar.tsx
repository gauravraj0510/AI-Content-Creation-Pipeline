'use client';

import { Brain, User, Menu, X } from "lucide-react";
import Link from "next/link";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="border-b border-gray-700 backdrop-blur-sm" style={{backgroundColor: 'rgba(21, 30, 44, 0.5)'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              ContentLeads
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center space-x-4">
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <Link href="/raw-ideas" className="px-3 py-2 text-sm bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-gray-300 hover:text-white hover:from-blue-500/30 hover:to-purple-500/30 rounded-lg transition-all duration-200">
                  Raw Ideas
                </Link>
                <Link href="/settings" className="px-3 py-2 text-sm bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-gray-300 hover:text-white hover:from-blue-500/30 hover:to-purple-500/30 rounded-lg transition-all duration-200">
                  Settings
                </Link>
                <div className="relative group">
                  <div className="p-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 rounded-lg transition-all duration-200 cursor-pointer">
                    <User className="h-5 w-5 text-gray-300 group-hover:text-white" />
                  </div>
                  <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                    <span className="text-sm text-gray-300">{user.email}</span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 transition-all duration-200 font-medium"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link href="/sign-in">
                <button className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium">
                  Sign In
                </button>
              </Link>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="sm:hidden flex items-center space-x-2">
            {user && (
              <div className="relative group">
                <div className="p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-all duration-200 cursor-pointer">
                  <User className="h-5 w-5 text-gray-300 group-hover:text-white" />
                </div>
                <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                  <span className="text-sm text-gray-300">{user.email}</span>
                </div>
              </div>
            )}
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
            ) : (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-300 hover:text-white transition-colors"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        <div className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="border-t border-gray-700 backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-8" style={{backgroundColor: 'rgba(21, 30, 44, 0.5)'}}>
            <div className="px-4 py-4 space-y-4">
              {user ? (
                <>
                  <Link 
                    href="/raw-ideas" 
                    className="block px-3 py-2 text-gray-300 hover:text-white bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 rounded-lg transition-all duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Raw Ideas
                  </Link>
                  <Link 
                    href="/settings" 
                    className="block px-3 py-2 text-gray-300 hover:text-white bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 rounded-lg transition-all duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-sm bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 transition-all duration-200 font-medium"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link 
                  href="/sign-in"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <button className="w-full px-3 py-2 text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium">
                    Sign In
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
