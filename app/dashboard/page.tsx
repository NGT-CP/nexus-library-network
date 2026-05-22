'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import AttendanceCalendar from './attendance-client';
import StudentProfile from './profile-client';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'profile'>('attendance');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (!error) {
      window.location.href = '/';
    } else {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Logout Button */}
      <div className="flex justify-between items-center mb-4">
        <div></div>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 font-bold px-6 py-2.5 rounded-lg transition-smooth shadow-lg shadow-red-500/20 hover:shadow-red-500/40 hover:scale-105 active:scale-95 uppercase tracking-wider text-sm border border-red-500/40 hover:border-red-500/60 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-3 border-b border-cyan-500/20 pb-4 animate-fade-in-up">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-6 py-3 text-sm font-bold uppercase tracking-wider rounded-lg transition-smooth ${
            activeTab === 'attendance'
              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
              : 'bg-black/40 text-gray-400 hover:text-cyan-300 border border-cyan-500/20 hover:border-cyan-500/40'
          }`}
        >
          📅 Attendance
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-6 py-3 text-sm font-bold uppercase tracking-wider rounded-lg transition-smooth ${
            activeTab === 'profile'
              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
              : 'bg-black/40 text-gray-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40'
          }`}
        >
          👤 My Profile
        </button>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in-up">
        {activeTab === 'attendance' && <AttendanceCalendar />}
        {activeTab === 'profile' && <StudentProfile />}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md px-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/40 bg-slate-900/95 shadow-2xl shadow-red-950/50 backdrop-blur-xl animate-scale-in">
            <div className="px-6 py-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-red-500/20 p-3 border border-red-500/40">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Sign Out?</h3>
              <p className="text-sm text-gray-400 mb-6">You will be logged out and redirected to the login page.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 rounded-lg border border-slate-600 bg-slate-800/50 hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-smooth"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/40 hover:shadow-red-400/50 disabled:opacity-60 disabled:cursor-not-allowed transition-smooth flex items-center justify-center gap-2"
                >
                  {isLoggingOut ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Signing out...
                    </>
                  ) : (
                    'Yes, Sign Out'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
