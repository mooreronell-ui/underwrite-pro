'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// Supabase auth token key for this project
const SUPABASE_AUTH_KEY = 'sb-engzooyyfnucsbzptfck-auth-token';

interface User {
  id: string;
  org_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for stored token on mount
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // TODO: Replace with actual login API call
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password })
      // });
      // const data = await response.json();

      // Placeholder: Mock login for demo
      const mockToken = 'mock_jwt_token_' + Date.now();
      const mockUser: User = {
        id: '22222222-2222-2222-2222-222222222222',
        org_id: '11111111-1111-1111-1111-111111111111',
        email: email,
        first_name: 'Sarah',
        last_name: 'Johnson',
        role: 'admin'
      };

      setToken(mockToken);
      setUser(mockUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', mockToken);
        localStorage.setItem('auth_user', JSON.stringify(mockUser));
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    // 1. Call Supabase API logout (non-blocking)
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Supabase signOut error (non-blocking):', error);
    }

    // 2. CRITICAL: Force clear all local storage tokens (Prevents stale state)
    if (typeof window !== 'undefined') {
      // Clear application tokens
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('up_token');
      localStorage.removeItem('up_user');
      
      // Clear Supabase session tokens
      const supabaseKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || key.includes('supabase')
      );
      supabaseKeys.forEach(key => localStorage.removeItem(key));
    }

    // 3. Clear React state
    setToken(null);
    setUser(null);

    // 4. Redirect to force a clean session load
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!token && !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
