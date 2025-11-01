'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, TrendingUp, AlertCircle } from 'lucide-react';

function UnderwritingContent() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealIdFromQuery = searchParams.get('deal_id');

  const [selectedDealId, setSelectedDealId] = useState(dealIdFromQuery || '');
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Only underwriters and admins can run underwriting
    if (user?.role !== 'underwriter' && user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    loadDeals();
  }, [isAuthenticated, user, router]);

  const loadDeals = async () => {
    try {
      const response = await api.getDeals({ limit: 100 });
      setDeals(response.data.data || []);
    } catch (err) {
      console.error('Failed to load deals:', err);
    }
  };

  const handleRunUnderwriting = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDealId) {
      setError('Please select a deal');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await api.runUnderwriting({ deal_id: selectedDealId });
      setResult(response.data.data);
    } catch (err: any) {
      console.error('Failed to run underwriting:', err);
      setError(err.response?.data?.message || 'Failed to run underwriting analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Run Underwriting Analysis</h1>
          <p className="text-sm text-gray-600 mt-1">
            Select a deal to perform underwriting calculations
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Selection Form */}
        <div className="card mb-6">
          <form onSubmit={handleRunUnderwriting}>
            <div className="mb-6">
              <label className="label">Select Deal *</label>
              <select
                value={selectedDealId}
                onChange={(e) => setSelectedDealId(e.target.value)}
                required
                className="input"
              >
                <option value="">-- Select a deal --</option>
                {deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.deal_name} - ${parseFloat(deal.loan_amount).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !selectedDealId}
              className="btn-primary w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Running Analysis...
                </span>
              ) : (
                'Run Underwriting Analysis'
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        {result && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Underwriting Results</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Analysis completed at {new Date(result.run_at).toLocaleString()}
                </p>
              </div>
              <span className={`badge ${getRecommendationColor(result.recommendation)} text-base px-4 py-2`}>
                {result.recommendation.toUpperCase()}
              </span>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">DSCR</p>
                <p className="text-3xl font-bold text-gray-900">{result.dscr}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {result.dscr >= 1.2 ? '✓ Meets minimum' : '✗ Below minimum'}
                </p>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">LTV</p>
                <p className="text-3xl font-bold text-gray-900">{result.ltv}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  {result.ltv <= 80 ? '✓ Within limits' : '✗ Above limit'}
                </p>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">NOI</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${parseFloat(result.noi).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Annual</p>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Risk Rating</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">{result.risk_rating}</p>
                <p className="text-xs text-gray-500 mt-1">Score: {result.risk_score}</p>
              </div>
            </div>

            {/* Additional Metrics */}
            {result.cap_rate && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Cap Rate</p>
                  <p className="text-lg font-semibold text-gray-900">{result.cap_rate}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Debt Service</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${parseFloat(result.debt_service).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cash Flow</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${parseFloat(result.cash_flow).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Risk Factors */}
            {result.risk_factors && result.risk_factors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Risk Factors</h3>
                <ul className="space-y-2">
                  {result.risk_factors.map((factor: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-gray-400 mt-0.5">•</span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes */}
            {result.notes && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Underwriter Notes</h3>
                <p className="text-sm text-blue-800">{result.notes}</p>
              </div>
            )}

            {/* Conditions */}
            {result.conditions && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-sm font-semibold text-yellow-900 mb-2">Conditions</h3>
                <p className="text-sm text-yellow-800">{result.conditions}</p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-4">
              <button
                onClick={() => router.push(`/deals/${selectedDealId}`)}
                className="btn-primary"
              >
                View Deal
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setSelectedDealId('');
                }}
                className="btn-secondary"
              >
                Run Another Analysis
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function getRecommendationColor(recommendation: string): string {
  const colors: Record<string, string> = {
    'approve': 'badge-success',
    'conditional': 'badge-warning',
    'decline': 'badge-error',
  };
  return colors[recommendation] || 'badge-info';
}

export default function UnderwritingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <UnderwritingContent />
    </Suspense>
  );
}
