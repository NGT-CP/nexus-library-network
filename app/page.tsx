'use client';

import { useState, Suspense, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyStudentAccess } from './actions';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const [loginType, setLoginType] = useState<'student' | 'admin'>('student');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const macAddress = searchParams.get('mac');
  const linkLogin = searchParams.get('link-login');

  // Validate link-login URL is HTTPS in production
  const isValidLoginUrl = (url: string | null) => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      if (process.env.NODE_ENV === 'production') {
        return parsed.protocol === 'https:';
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    console.log('Login attempt with phone:', phone);

    // Call the secure Server Action
    const result = await verifyStudentAccess(phone);

    console.log('Verify result:', result);

    if (!result.success) {
      setMessage({ text: result.error, type: 'error' });
      setLoading(false);
      return;
    }

    setMessage({ text: 'Access verified! Redirecting to dashboard...', type: 'success' });
    console.log('Redirecting to dashboard...');

    // If MikroTik URL exists, submit the hidden form
    if (linkLogin && isValidLoginUrl(linkLogin) && formRef.current) {
      setTimeout(() => {
        formRef.current?.submit();
      }, 500);
    } else {
      // Redirect to dashboard when no router URL
      setTimeout(() => {
        console.log('Performing redirect to /dashboard');
        router.push('/dashboard');
      }, 500);
    }

    setLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    const { error, data } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage({ text: error.message, type: 'error' });
      setLoading(false);
      return;
    }

    if (!data.session) {
      setMessage({ text: 'Login successful but session not created. Please try again.', type: 'error' });
      setLoading(false);
      return;
    }

    setMessage({ text: 'Authentication successful! Redirecting...', type: 'success' });

    setTimeout(() => {
      window.location.href = '/admin';
    }, 1000);

    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (loginType === 'student') {
      handleStudentLogin(e);
    } else {
      handleAdminLogin(e);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="backdrop-blur-xl bg-black/30 border border-cyan-500/20 rounded-2xl shadow-2xl p-8 sm:p-10 hover:border-cyan-500/40 transition-smooth animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="mb-6 flex justify-center">
            <div className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              NEXUS
            </div>
          </div>
          <p className="text-cyan-300 font-light tracking-wider text-sm">LIBRARY NETWORK</p>
          <p className="text-gray-400 text-xs mt-2">High-speed secure access</p>
        </div>

        {/* Login Type Selector */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => { setLoginType('student'); setMessage({ text: '', type: '' }); }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-smooth ${loginType === 'student'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/50'
                : 'bg-black/40 text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/50'
              }`}
          >
            Student
          </button>
          <button
            type="button"
            onClick={() => { setLoginType('admin'); setMessage({ text: '', type: '' }); }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-smooth ${loginType === 'admin'
                ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/50'
                : 'bg-black/40 text-orange-300 border border-orange-500/30 hover:border-orange-500/50'
              }`}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-cyan-300 mb-2 uppercase tracking-widest">
              {loginType === 'student' ? 'Phone' : 'Email'}
            </label>
            <input
              type={loginType === 'student' ? 'tel' : 'email'}
              value={loginType === 'student' ? phone : email}
              onChange={(e) => loginType === 'student' ? setPhone(e.target.value) : setEmail(e.target.value)}
              placeholder={loginType === 'student' ? 'Enter your phone' : 'Enter your email'}
              autoComplete={loginType === 'student' ? 'tel' : 'email'}
              required
              className="w-full px-4 py-3 bg-black/50 border border-cyan-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-smooth duration-200 backdrop-blur-sm hover:border-cyan-500/50"
            />
          </div>

          {loginType === 'admin' && (
            <div>
              <label className="block text-xs font-semibold text-orange-300 mb-2 uppercase tracking-widest">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full px-4 py-3 bg-black/50 border border-orange-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 transition-smooth duration-200 backdrop-blur-sm hover:border-orange-500/50"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-black font-bold py-3 rounded-lg transition-smooth duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:scale-105 active:scale-95 uppercase tracking-wider text-sm ${loginType === 'student'
                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-cyan-500/50 hover:shadow-cyan-400/50'
                : 'bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-400 hover:to-blue-500 shadow-orange-500/50 hover:shadow-orange-400/50'
              }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loginType === 'student' ? 'Connecting...' : 'Authenticating...'}
              </span>
            ) : (
              loginType === 'student' ? 'Access Network' : 'Admin Login'
            )}
          </button>
        </form>

        {message.text && (
          <div className={`p-3 rounded-lg text-xs text-center font-semibold transition-smooth duration-300 animate-scale-in ${message.type === 'error'
              ? 'bg-red-500/20 text-red-300 border border-red-500/30 backdrop-blur-sm'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-sm'
            }`}>
            {message.text}
          </div>
        )}

        {macAddress && loginType === 'student' && (
          <div className="mt-6 p-3 bg-black/40 rounded-lg border border-purple-500/20 backdrop-blur-sm hover:border-purple-500/40 transition-smooth">
            <p className="text-xs text-purple-300">
              <span className="font-bold text-purple-400">MAC:</span> <span className="font-mono text-gray-400">{macAddress}</span>
            </p>
          </div>
        )}

        {/* Hidden MikroTik form - this submits credentials to the router */}
        <form ref={formRef} action={linkLogin || ''} method="POST" className="hidden">
          <input type="hidden" name="username" value={phone} />
          <input type="hidden" name="password" value={phone} />
        </form>
      </div>

      <div className="text-center text-xs text-gray-500 mt-6 font-light">
        {loginType === 'student' ? 'Secured • Monitored • Anonymous' : 'Admin Access Only'}
      </div>
    </div>
  );
}

export default function CaptivePortalLogin() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-float"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-float"></div>
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-pink-500/10 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-float"></div>
      </div>

      <Suspense fallback={
        <div className="text-center animate-fade-in">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-purple-400 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-cyan-300 text-sm font-light">Loading...</p>
        </div>
      }>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}