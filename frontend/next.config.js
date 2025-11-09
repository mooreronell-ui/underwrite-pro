/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://engzooyyfnucsbzptfck.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuZ3pvb3l5Zm51Y3NienB0ZmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5MzYwMzcsImV4cCI6MjA0NjUxMjAzN30.Uw3FvKSLdNTZvxuAWdBEqJZoH3dMmJSHXPDqTiOXxJY',
  },
}

module.exports = nextConfig
