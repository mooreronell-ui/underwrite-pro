'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Search } from 'lucide-react';

export default function DealsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      loadDeals();
    }
  }, [isAuthenticated, authLoading, router, statusFilter]);

  const loadDeals = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { page: 1, limit: 50 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await api.getDeals(params);
      setDeals(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to load deals:', err);
      setError(err.response?.data?.message || 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  const filteredDeals = deals.filter(deal =>
    deal.deal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (deal.borrower_name && deal.borrower_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
              <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
              <p className="text-sm text-gray-600 mt-1">Manage your commercial loan deals</p>
            </div>
            <button onClick={() => router.push('/deals/new')} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Deal
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search deals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input md:w-48"
            >
              <option value="all">All Statuses</option>
              <option value="intake">Intake</option>
              <option value="underwriting">Underwriting</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
              <option value="term_sheet_sent">Term Sheet Sent</option>
            </select>
          </div>
        </div>

        {/* Deals Table */}
        <div className="card">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading deals...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
              <button onClick={loadDeals} className="btn-primary mt-4">
                Retry
              </button>
            </div>
          ) : filteredDeals.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' ? 'No deals match your filters' : 'No deals yet'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button onClick={() => router.push('/deals/new')} className="btn-primary mt-4">
                  Create Your First Deal
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Deal Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Borrower</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Loan Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Asset Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeals.map((deal) => (
                    <tr
                      key={deal.id}
                      onClick={() => router.push(`/deals/${deal.id}`)}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{deal.deal_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{deal.borrower_name || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        ${parseFloat(deal.loan_amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 capitalize">{deal.asset_type}</td>
                      <td className="py-3 px-4">
                        <span className={`badge ${getStatusColor(deal.status)}`}>
                          {deal.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(deal.created_at).toLocaleDateString()}
                      </td>
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
