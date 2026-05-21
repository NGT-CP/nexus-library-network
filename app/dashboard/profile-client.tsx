'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

type StudentProfile = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  target_exam: string | null;
  speed_limit: string;
  address: string | null;
  created_at: string;
};

export default function StudentProfile() {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.phone) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('students')
        .select('id, name, phone, email, target_exam, speed_limit, address, created_at')
        .eq('phone', session.user.phone)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setStudent(data);
      }

      setLoading(false);
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-black/40 border border-emerald-500/20 rounded-2xl p-12 text-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-emerald-300 text-sm">Loading profile...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="backdrop-blur-xl bg-black/40 border border-red-500/20 rounded-2xl p-6 text-center">
        <p className="text-red-300">Unable to load profile information</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="backdrop-blur-xl bg-black/40 border border-emerald-500/20 rounded-2xl p-8 hover:border-emerald-500/40 transition-smooth animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6 pb-6 border-b border-emerald-500/20">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-emerald-300 mb-1">{student.name}</h2>
            <p className="text-gray-400 text-sm">Member since {format(new Date(student.created_at), 'MMM dd, yyyy')}</p>
          </div>
        </div>

        {/* Profile Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Phone */}
          <div className="bg-black/40 border border-emerald-500/30 rounded-lg p-4 hover:border-emerald-500/50 transition-smooth">
            <p className="text-emerald-400 text-xs uppercase tracking-widest font-semibold mb-1">Phone Number</p>
            <p className="text-white font-semibold font-mono text-lg">{student.phone}</p>
          </div>

          {/* Email */}
          <div className="bg-black/40 border border-cyan-500/30 rounded-lg p-4 hover:border-cyan-500/50 transition-smooth">
            <p className="text-cyan-400 text-xs uppercase tracking-widest font-semibold mb-1">Email Address</p>
            <p className="text-white font-semibold text-lg break-all">
              {student.email || <span className="text-gray-500 italic">Not provided</span>}
            </p>
          </div>

          {/* Target Exam */}
          <div className="bg-black/40 border border-orange-500/30 rounded-lg p-4 hover:border-orange-500/50 transition-smooth">
            <p className="text-orange-400 text-xs uppercase tracking-widest font-semibold mb-1">Target Exam</p>
            <p className="text-white font-semibold text-lg">
              {student.target_exam || <span className="text-gray-500 italic">Not specified</span>}
            </p>
          </div>

          {/* Speed Limit */}
          <div className="bg-black/40 border border-blue-500/30 rounded-lg p-4 hover:border-blue-500/50 transition-smooth">
            <p className="text-blue-400 text-xs uppercase tracking-widest font-semibold mb-1">Network Speed Limit</p>
            <p className="text-white font-semibold text-lg">{student.speed_limit}</p>
          </div>
        </div>

        {/* Address (Full Width) */}
        {student.address && (
          <div className="bg-black/40 border border-purple-500/30 rounded-lg p-4 hover:border-purple-500/50 transition-smooth mt-6">
            <p className="text-purple-400 text-xs uppercase tracking-widest font-semibold mb-2">Address</p>
            <p className="text-gray-300 leading-relaxed">{student.address}</p>
          </div>
        )}
      </div>

      {/* Read-Only Notice */}
      <div className="backdrop-blur-xl bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex gap-3 animate-fade-in-up">
        <div className="flex-shrink-0 pt-0.5">
          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0zM8 7a1 1 0 000 2h6a1 1 0 100-2H8zm0 4a1 1 0 100 2h6a1 1 0 100-2H8z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="text-blue-300 text-sm font-semibold">Personal Information is Read-Only</p>
          <p className="text-blue-200/70 text-xs mt-1">
            To update your personal details or contact information, please contact the library administrator. This ensures your network access remains properly configured.
          </p>
        </div>
      </div>
    </div>
  );
}
