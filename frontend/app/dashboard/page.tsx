'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { TrendingUp, FileText, CheckCircle, Clock, Brain, Zap, BarChart3, Shield } from 'lucide-react';

interface DashboardStats {
  total_deals: number;
  active_deals: number;
  approved_deals: number;
  pending_underwriting: number;
}

interface AIFeature {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: 'operational' | 'coming_soon';
  endpoint?: string;
}

export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    total_deals: 0,
    active_deals: 0,
    approved_deals: 0,
    pending_underwriting: 0
  });
  const [recentDeals, setRecentDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // AI Features Configuration
  const aiFeatures: AIFeature[] = [
    {
      id: 'risk-assessment',
      title: 'ML Risk Assessment',
      description: '92.6% accuracy • <100ms response',
      icon: Shield,
      status: 'operational',
      endpoint: '/api/ai/risk-score'
    },
    {
      id: 'executive-summary',
      title: 'Executive Summaries',
      description: 'GPT-4 powered • Credit Committee ready',
      icon: FileText,
      status: 'operational',
      endpoint: '/api/ai/summary'
    },
    {
      id: 'stress-testing',
      title: 'Stress Testing',
      description: '7 scenarios • 11 metrics per scenario',
      icon: BarChart3,
      status: 'operational',
      endpoint: '/api/ai/stress-test'
    },
    {
      id: 'market-data',
      title: 'Market Intelligence',
      description: 'Real-time lender & property data',
      icon: TrendingUp,
      status: 'operational',
      endpoint: '/api/market'
    }
  ];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, authLoading, router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch recent deals
      const dealsResponse = await api.getDeals({ page: 1, limit: 5 });
      const deals = dealsResponse.data.data || dealsResponse.data.deals || [];
      const responseNote = dealsResponse.data.note || null;
      setRecentDeals(deals);
      setNote(responseNote);

      // Calculate stats from deals
      setStats({
        total_deals: dealsResponse.data.pagination?.total || 0,
        active_deals: deals.filter((d: any) => ['intake', 'underwriting', 'term_sheet_sent'].includes(d.status)).length,
        approved_deals: deals.filter((d: any) => d.status === 'approved').length,
        pending_underwriting: deals.filter((d: any) => d.status === 'intake').length
      });
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md">
          <div className="text-red-600 text-center">
            <p className="font-semibold text-lg">Error</p>
            <p className="mt-2 text-gray-600">{error}</p>
            <button onClick={loadDashboardData} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (note && recentDeals.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-semibold text-gray-800 tracking-tight">Dashboard</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="font-semibold text-yellow-900">{note}</p>
            {note.includes('No active org') && (
              <p className="mt-2 text-sm text-yellow-800">Use the Active Org switcher in the header to create or select an organization.</p>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-semibold text-gray-800 tracking-tight">Welcome Back</h1>
              <p className="text-sm text-gray-500 mt-2 font-medium">
                {user?.first_name} {user?.last_name}
              </p>
            </div>
            <button 
              onClick={() => router.push('/deals/new')} 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              + New Deal
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* AI Features Section - PROMINENT */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 shadow-lg">
          <div className="flex items-center mb-6">
            <Brain className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">AI-Powered Intelligence</h2>
              <p className="text-sm text-gray-600 mt-1">Institutional-grade AI features at your fingertips</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {aiFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={feature.id}
                  className="bg-white rounded-xl p-5 border border-gray-200 hover:border-blue-300 transition-all hover:shadow-md cursor-pointer group"
                  onClick={() => feature.endpoint && router.push('/deals')}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    {feature.status === 'operational' && (
                      <span className="flex items-center text-xs text-green-600 font-medium">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                        Live
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1.5">{feature.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* KPI Cards - Enhanced Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">Total Deals</p>
                <p className="text-3xl font-semibold text-gray-800">{stats.total_deals}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">Active Deals</p>
                <p className="text-3xl font-semibold text-gray-800">{stats.active_deals}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-xl">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">Approved</p>
                <p className="text-3xl font-semibold text-green-600">{stats.approved_deals}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">Pending Review</p>
                <p className="text-3xl font-semibold text-gray-800">{stats.pending_underwriting}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Deals - Enhanced Table */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Recent Deals</h2>
            <button 
              onClick={() => router.push('/deals')} 
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
            >
              View All 
              <span className="ml-1">→</span>
            </button>
          </div>

          {recentDeals.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium mb-2">No deals yet</p>
              <p className="text-sm text-gray-500 mb-6">Create your first deal to get started</p>
              <button 
                onClick={() => router.push('/deals/new')} 
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center"
              >
                <Zap className="w-4 h-4 mr-2" />
                Create Your First Deal
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Deal Name</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Borrower</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Loan Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Asset Type</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeals.map((deal) => (
                    <tr 
                      key={deal.id} 
                      onClick={() => router.push(`/deals/${deal.id}`)}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-4 text-sm font-medium text-gray-800">{deal.deal_name}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{deal.borrower_name || 'N/A'}</td>
                      <td className="py-4 px-4 text-sm font-semibold text-gray-800">
                        ${parseFloat(deal.loan_amount).toLocaleString()}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(deal.status)}`}>
                          {deal.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600 capitalize">{deal.asset_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function getStatusStyle(status: string): string {
  const styles: Record<string, string> = {
    'intake': 'bg-blue-100 text-blue-700',
    'underwriting': 'bg-yellow-100 text-yellow-700',
    'approved': 'bg-green-100 text-green-700',
    'declined': 'bg-red-100 text-red-700',
    'term_sheet_sent': 'bg-purple-100 text-purple-700',
    'draft': 'bg-gray-100 text-gray-700',
  };
  return styles[status] || 'bg-gray-100 text-gray-700';
}
