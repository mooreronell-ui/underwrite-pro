"use client";
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import OrgSwitcher from './OrgSwitcher';

export default function AppHeader() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="flex justify-between items-center px-6 py-3 border-b border-gray-100 bg-white shadow-sm/50">
      <Link href="/" className="text-xl font-bold text-blue-700">
        Underwrite Pro
      </Link>
      
      <nav className="flex items-center space-x-6">
        {isAuthenticated ? (
          <>
            <OrgSwitcher />
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-blue-600 transition">
              Dashboard
            </Link>
            <Link href="/deals" className="text-sm text-gray-500 hover:text-blue-600 transition">
              Deals
            </Link>
            <div className="flex items-center space-x-3 border-l pl-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <Link href="/demo" className="text-sm text-gray-500 hover:text-blue-600 transition">
              Demo
            </Link>
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition">
              Login
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
