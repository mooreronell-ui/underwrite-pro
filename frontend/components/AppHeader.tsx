"use client";
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import OrgSwitcher from './OrgSwitcher';

export default function AppHeader() {
  const { isAuthenticated, signOut } = useAuth();

  return (
    <header className="flex justify-between items-center p-4 border-b">
      <Link href="/" className="text-xl font-bold text-blue-700">Underwrite Pro</Link>
      <nav className="flex items-center space-x-4">
        {isAuthenticated && <OrgSwitcher />}
        <Link href="/demo" className="text-sm text-gray-600">Demo</Link>
        {isAuthenticated ? (
          <button onClick={signOut} className="text-sm text-red-600">Sign Out</button>
        ) : (
          <Link href="/login" className="text-sm text-green-600">Login</Link>
        )}
      </nav>
    </header>
  );
}
