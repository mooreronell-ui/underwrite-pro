"use client";
import Link from 'next/link';

export default function AppHeader() {
  return (
    <header className="flex justify-between items-center p-4 border-b bg-white">
      <Link href="/" className="text-xl font-bold text-blue-700">Underwrite Pro</Link>
      <nav className="flex items-center space-x-4">
        <Link href="/demo" className="text-sm text-gray-600">Demo</Link>
        <Link href="/login" className="text-sm text-green-600">Login</Link>
      </nav>
    </header>
  );
}
