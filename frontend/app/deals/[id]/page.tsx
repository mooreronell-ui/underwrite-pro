'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, FileText, TrendingUp } from 'lucide-react';

export default function DealDetailPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const dealId = params.id as string;

  const [deal, setDeal] = useState<any>(null);
  const [underwritingResults, setUnderwritingResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'underwriting' | 'documents'>('details');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (dealId) {
      loadDealData();
    }
  }, [isAuthenticated, dealId, router]);

  const loadDealData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load deal details
      const dealResponse = await api.getDealById(dealId);
      setDeal(dealResponse.data.data);

      // Load underwriting results
      try {
        const underwritingResponse = await api.getUnderwritingByDealId(dealId);
        setUnderwritingResults(underwritingResponse.data.data || []);
      } catch (err) {
        // Underwriting results may not exist yet
        console.log('No underwriting results yet');
      }
    } catch (err: any) {
      console.error('Failed to load deal:', err);
      setError(err.response?.data?.message || 'Failed to load deal');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card max-w-md">
          <p className="text-red-600">{error || 'Deal not found'}</p>
          <button onClick={() => router.push('/deals')} className="btn-primary mt-4">
            Back to Deals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button 
            onClick={() => router.push('/deals')} 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Deals
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{deal.deal_name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {deal.borrower_name} • ${parseFloat(deal.loan_amount).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <span className={`badge ${getStatusColor(deal.status)}`}>
                {deal.status.replace(/_/g, ' ')}
              </span>
              {user?.role === 'underwriter' && (
                <button 
                  onClick={() => router.push(`/underwriting?deal_id=${dealId}`)}
                  className="btn-primary"
                >
                  Run Underwriting
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('underwriting')}
              className={`py-4 border-b-2 font-medium text-sm ${
                activeTab === 'underwriting'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Underwriting ({underwritingResults.length})
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 border-b-2 font-medium text-sm ${
                activeTab === 'documents'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Documents
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deal Information */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Deal Information</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-600">Loan Amount</dt>
                  <dd className="text-base font-medium text-gray-900">
                    ${parseFloat(deal.loan_amount).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Asset Type</dt>
                  <dd className="text-base font-medium text-gray-900 capitalize">{deal.asset_type}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Loan Purpose</dt>
                  <dd className="text-base font-medium text-gray-900 capitalize">
                    {deal.loan_purpose || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Loan Type</dt>
                  <dd className="text-base font-medium text-gray-900 capitalize">
                    {deal.loan_type || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Requested LTV</dt>
                  <dd className="text-base font-medium text-gray-900">
                    {deal.requested_ltv ? `${deal.requested_ltv}%` : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Requested Rate</dt>
                  <dd className="text-base font-medium text-gray-900">
                    {deal.requested_rate ? `${deal.requested_rate}%` : 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Property Information */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Information</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-600">Address</dt>
                  <dd className="text-base font-medium text-gray-900">
                    {deal.property_address_line1 || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">City, State</dt>
                  <dd className="text-base font-medium text-gray-900">
                    {deal.property_city && deal.property_state
                      ? `${deal.property_city}, ${deal.property_state}`
                      : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Zip Code</dt>
                  <dd className="text-base font-medium text-gray-900">
                    {deal.property_zip_code || 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Team */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Team</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-600">Broker</dt>
                  <dd className="text-base font-medium text-gray-900">
                    {deal.broker_email || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Assigned To</dt>
                  <dd className="text-base font-medium text-gray-900">
                    {deal.assigned_to_email || 'Not assigned'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Notes */}
            {deal.notes && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                <p className="text-sm text-gray-700">{deal.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'underwriting' && (
          <div>
            {underwritingResults.length === 0 ? (
              <div className="card text-center py-12">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No underwriting results yet</p>
                {user?.role === 'underwriter' && (
                  <button 
                    onClick={() => router.push(`/underwriting?deal_id=${dealId}`)}
                    className="btn-primary"
                  >
                    Run Underwriting Analysis
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {underwritingResults.map((result) => (
                  <div key={result.id} className="card">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Underwriting Result
                        </h3>
                        <p className="text-sm text-gray-600">
                          Run by {result.underwriter_email} on{' '}
                          {new Date(result.run_at).toLocaleString()}
                        </p>
                      </div>
                      <span className={`badge ${getRecommendationColor(result.recommendation)}`}>
                        {result.recommendation}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">DSCR</p>
                        <p className="text-xl font-bold text-gray-900">{result.dscr}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">LTV</p>
                        <p className="text-xl font-bold text-gray-900">{result.ltv}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">NOI</p>
                        <p className="text-xl font-bold text-gray-900">
                          ${parseFloat(result.noi).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Risk Rating</p>
                        <p className="text-xl font-bold text-gray-900 capitalize">
                          {result.risk_rating}
                        </p>
                      </div>
                    </div>

                    {result.notes && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{result.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="card text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No documents yet</p>
          </div>
        )}
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

function getRecommendationColor(recommendation: string): string {
  const colors: Record<string, string> = {
    'approve': 'badge-success',
    'conditional': 'badge-warning',
    'decline': 'badge-error',
  };
  return colors[recommendation] || 'badge-info';
}
