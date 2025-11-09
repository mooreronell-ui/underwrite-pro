'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

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
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token refresh interval: 50 minutes (tokens expire at 60 minutes)
const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Function to extract user data from Supabase session
  const extractUserFromSession = useCallback(async (session: Session): Promise<User | null> => {
    try {
      const supabaseUser = session.user;
      
      // Get user's active organization from backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orgs/mine`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch user organizations');
        return null;
      }

      const data = await response.json();
      const activeOrg = data.organizations?.find((org: any) => org.is_active) || data.organizations?.[0];

      if (!activeOrg) {
        console.error('No organization found for user');
        return null;
      }

      return {
        id: supabaseUser.id,
        org_id: activeOrg.id,
        email: supabaseUser.email || '',
        first_name: supabaseUser.user_metadata?.first_name || '',
        last_name: supabaseUser.user_metadata?.last_name || '',
        role: supabaseUser.user_metadata?.role || 'user'
      };
    } catch (error) {
      console.error('Error extracting user from session:', error);
      return null;
    }
  }, []);

  // Function to refresh the session
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh failed:', error);
        // If refresh fails, log out the user
        await logout();
        return;
      }

      if (data.session) {
        setToken(data.session.access_token);
        const userData = await extractUserFromSession(data.session);
        if (userData) {
          setUser(userData);
          // Persist to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', data.session.access_token);
            localStorage.setItem('auth_user', JSON.stringify(userData));
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  }, [extractUserFromSession]);

  // Set up automatic token refresh
  useEffect(() => {
    if (token && !refreshTimer) {
      const timer = setInterval(() => {
        console.log('Auto-refreshing session token...');
        refreshSession();
      }, TOKEN_REFRESH_INTERVAL);
      
      setRefreshTimer(timer);
      
      return () => {
        if (timer) clearInterval(timer);
      };
    }
  }, [token, refreshTimer, refreshSession]);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for existing Supabase session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        if (session) {
          setToken(session.access_token);
          const userData = await extractUserFromSession(session);
          if (userData) {
            setUser(userData);
            // Persist to localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('auth_token', session.access_token);
              localStorage.setItem('auth_user', JSON.stringify(userData));
            }
          }
        } else {
          // Try to restore from localStorage as fallback
          if (typeof window !== 'undefined') {
            const storedToken = localStorage.getItem('auth_token');
            const storedUser = localStorage.getItem('auth_user');

            if (storedToken && storedUser) {
              // Verify token is still valid by attempting refresh
              await refreshSession();
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session) {
        setToken(session.access_token);
        const userData = await extractUserFromSession(session);
        if (userData) {
          setUser(userData);
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', session.access_token);
            localStorage.setItem('auth_user', JSON.stringify(userData));
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setToken(null);
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setToken(session.access_token);
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', session.access_token);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [extractUserFromSession, refreshSession]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Use Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.session) {
        throw new Error('No session returned from login');
      }

      // Extract user data
      setToken(data.session.access_token);
      const userData = await extractUserFromSession(data.session);
      
      if (!userData) {
        throw new Error('Failed to load user data');
      }

      setUser(userData);

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.session.access_token);
        localStorage.setItem('auth_user', JSON.stringify(userData));
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear refresh timer
      if (refreshTimer) {
        clearInterval(refreshTimer);
        setRefreshTimer(null);
      }

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Clear local state
      setToken(null);
      setUser(null);

      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('up_token');
        localStorage.removeItem('up_user');
        
        // Clear all Supabase session tokens
        const supabaseKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('sb-') || key.includes('supabase')
        );
        supabaseKeys.forEach(key => localStorage.removeItem(key));
      }

      // Redirect to login
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      setToken(null);
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        refreshSession
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
