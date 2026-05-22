'use client';

import { useState, Suspense } from 'react';
import { getStudentSession, getStudentData } from './actions';
import AttendanceCalendar from './attendance-client';
import StudentProfile from './profile-client';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'profile'>('attendance');

  return (
    <div className="space-y-6">
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
        {activeTab === 'attendance' && (
          <Suspense
            fallback={
              <div className="backdrop-blur-xl bg-black/40 border border-cyan-500/20 rounded-2xl p-12 text-center">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-cyan-300 text-sm">Loading calendar...</p>
              </div>
            }
          >
            <AttendanceCalendar />
          </Suspense>
        )}

        {activeTab === 'profile' && (
          <Suspense
            fallback={
              <div className="backdrop-blur-xl bg-black/40 border border-emerald-500/20 rounded-2xl p-12 text-center">
                <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-emerald-300 text-sm">Loading profile...</p>
              </div>
            }
          >
            <StudentProfile />
          </Suspense>
        )}
      </div>
    </div>
  );
}
