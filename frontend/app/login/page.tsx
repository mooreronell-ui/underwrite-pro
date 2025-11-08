'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      // Sign in with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // Store access token for API calls
      const accessToken = data.session?.access_token;
      if (accessToken && typeof window !== 'undefined') {
        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      }

      console.log('✓ Login successful:', data.user?.email);
      console.log('✓ Token stored, redirecting to dashboard...');
      
      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/80">
      <div className="max-w-md w-full">
        <div className="bg-white p-10 rounded-xl shadow-lg border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-gray-800 mb-2 font-sans">Underwrite Pro</h1>
            <p className="text-sm text-gray-500 mt-2 tracking-tight">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>

            <div className="mb-6">
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-150 font-medium tracking-wide shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Use your Supabase Auth credentials
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
