'use client';

import { useState } from 'react';

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
          <div className="backdrop-blur-xl bg-black/40 border border-cyan-500/20 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-cyan-300 mb-4">Attendance Calendar</h2>
            <p className="text-gray-400">Demo - Attendance tracking UI</p>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="backdrop-blur-xl bg-black/40 border border-emerald-500/20 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-emerald-300 mb-4">My Profile</h2>
            <div className="space-y-4 text-gray-300">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="text-lg font-semibold">Demo Student</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-lg font-semibold">1234567890</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Target Exam</p>
                <p className="text-lg font-semibold">NEET</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Speed Limit</p>
                <p className="text-lg font-semibold">10 Mbps</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
