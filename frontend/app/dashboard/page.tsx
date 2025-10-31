'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { TrendingUp, FileText, CheckCircle, Clock } from 'lucide-react';

interface DashboardStats {
  total_deals: number;
  active_deals: number;
  approved_deals: number;
  pending_underwriting: number;
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
      const deals = dealsResponse.data.data || [];
      setRecentDeals(deals);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card max-w-md">
          <div className="text-red-600 text-center">
            <p className="font-semibold">Error</p>
            <p className="mt-2">{error}</p>
            <button onClick={loadDashboardData} className="btn-primary mt-4">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, {user?.first_name} {user?.last_name}
              </p>
            </div>
            <button onClick={() => router.push('/deals/new')} className="btn-primary">
              + New Deal
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Deals</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total_deals}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Deals</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.active_deals}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.approved_deals}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pending_underwriting}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Deals */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Deals</h2>
            <button onClick={() => router.push('/deals')} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View All →
            </button>
          </div>

          {recentDeals.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No deals yet</p>
              <button onClick={() => router.push('/deals/new')} className="btn-primary mt-4">
                Create Your First Deal
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Deal Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Borrower</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Loan Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Asset Type</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeals.map((deal) => (
                    <tr 
                      key={deal.id} 
                      onClick={() => router.push(`/deals/${deal.id}`)}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="py-3 px-4 text-sm text-gray-900">{deal.deal_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{deal.borrower_name || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        ${parseFloat(deal.loan_amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge ${getStatusColor(deal.status)}`}>
                          {deal.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 capitalize">{deal.asset_type}</td>
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

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'intake': 'badge-info',
    'underwriting': 'badge-warning',
    'approved': 'badge-success',
    'declined': 'badge-error',
    'term_sheet_sent': 'badge-info',
  };
  return colors[status] || 'badge-info';
}
