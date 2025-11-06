"use client";
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import OrgSwitcher from './OrgSwitcher';

export default function AppHeader() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="flex justify-between items-center p-4 border-b bg-white shadow-sm">
      <Link href="/" className="text-xl font-bold text-blue-700">
        Underwrite Pro
      </Link>
      
      <nav className="flex items-center space-x-6">
        {isAuthenticated ? (
          <>
            <OrgSwitcher />
            <Link href="/dashboard" className="text-sm text-gray-700 hover:text-blue-600">
              Dashboard
            </Link>
            <Link href="/deals" className="text-sm text-gray-700 hover:text-blue-600">
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
            <Link href="/demo" className="text-sm text-gray-600 hover:text-blue-600">
              Demo
            </Link>
            <Link href="/login" className="text-sm text-green-600 hover:text-green-700 font-medium">
              Login
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
