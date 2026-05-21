import { getStudentSession, getStudentData } from './actions';
import { Suspense, ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

async function StudentHeader() {
  const session = await getStudentSession();
  const student = await getStudentData(session.user.phone || '');

  if (!student) {
    return null;
  }

  const nameInitial = student.name.charAt(0).toUpperCase();
  const gradientColors = [
    'from-cyan-400 to-blue-600',
    'from-orange-400 to-pink-600',
    'from-emerald-400 to-teal-600',
    'from-purple-400 to-pink-600',
  ];
  const gradientIndex = student.id % gradientColors.length;
  const gradient = gradientColors[gradientIndex];

  return (
    <div className="flex justify-between items-center mb-8 animate-slide-in-down">
      <div>
        <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-1">
          Welcome, {student.name}
        </h1>
        <p className="text-gray-400 text-sm font-light">Student Dashboard</p>
      </div>
      <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
        {nameInitial}
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-black text-white p-6 sm:p-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-float"></div>
        <div className="absolute bottom-1/3 right-0 w-96 h-96 bg-emerald-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-float animate-delay-300"></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-blue-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-25 animate-float animate-delay-500"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <Suspense
          fallback={
            <div className="text-center animate-fade-in">
              <div className="w-10 h-10 border-2 border-cyan-400 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-cyan-300 text-sm font-light">Loading your dashboard...</p>
            </div>
          }
        >
          <StudentHeader />
        </Suspense>

        {children}
      </div>
    </div>
  );
}
