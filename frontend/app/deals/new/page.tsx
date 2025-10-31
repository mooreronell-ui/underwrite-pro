'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function NewDealPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    borrower_id: '66666666-6666-6666-6666-666666666666', // Demo borrower from seed data
    deal_name: '',
    loan_amount: '',
    asset_type: 'multifamily',
    property_address_line1: '',
    property_city: '',
    property_state: '',
    property_zip_code: '',
    loan_purpose: 'purchase',
    loan_type: 'bridge',
    requested_ltv: '',
    requested_rate: '',
    requested_term_months: '',
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      // Convert string values to numbers where needed
      const payload = {
        ...formData,
        loan_amount: parseFloat(formData.loan_amount),
        requested_ltv: formData.requested_ltv ? parseFloat(formData.requested_ltv) : undefined,
        requested_rate: formData.requested_rate ? parseFloat(formData.requested_rate) : undefined,
        requested_term_months: formData.requested_term_months ? parseInt(formData.requested_term_months) : undefined
      };

      const response = await api.createDeal(payload);
      
      // Redirect to deal detail page
      router.push(`/deals/${response.data.data.id}`);
    } catch (err: any) {
      console.error('Failed to create deal:', err);
      setError(err.response?.data?.message || 'Failed to create deal');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Create New Deal</h1>
          <p className="text-sm text-gray-600 mt-1">Enter the deal information below</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="card">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Deal Name *</label>
                <input
                  type="text"
                  name="deal_name"
                  value={formData.deal_name}
                  onChange={handleChange}
                  required
                  className="input"
                  placeholder="e.g., Riverside Apartments Acquisition"
                />
              </div>

              <div>
                <label className="label">Loan Amount *</label>
                <input
                  type="number"
                  name="loan_amount"
                  value={formData.loan_amount}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="input"
                  placeholder="e.g., 3750000"
                />
              </div>

              <div>
                <label className="label">Asset Type *</label>
                <select
                  name="asset_type"
                  value={formData.asset_type}
                  onChange={handleChange}
                  required
                  className="input"
                >
                  <option value="multifamily">Multifamily</option>
                  <option value="retail">Retail</option>
                  <option value="office">Office</option>
                  <option value="industrial">Industrial</option>
                  <option value="mhp">Mobile Home Park</option>
                  <option value="mixed_use">Mixed Use</option>
                  <option value="land">Land</option>
                </select>
              </div>
            </div>
          </div>

          {/* Property Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Address</label>
                <input
                  type="text"
                  name="property_address_line1"
                  value={formData.property_address_line1}
                  onChange={handleChange}
                  className="input"
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <label className="label">City</label>
                <input
                  type="text"
                  name="property_city"
                  value={formData.property_city}
                  onChange={handleChange}
                  className="input"
                  placeholder="Austin"
                />
              </div>

              <div>
                <label className="label">State</label>
                <input
                  type="text"
                  name="property_state"
                  value={formData.property_state}
                  onChange={handleChange}
                  className="input"
                  placeholder="TX"
                />
              </div>

              <div>
                <label className="label">Zip Code</label>
                <input
                  type="text"
                  name="property_zip_code"
                  value={formData.property_zip_code}
                  onChange={handleChange}
                  className="input"
                  placeholder="78701"
                />
              </div>
            </div>
          </div>

          {/* Loan Terms */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Loan Terms</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Loan Purpose</label>
                <select
                  name="loan_purpose"
                  value={formData.loan_purpose}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="purchase">Purchase</option>
                  <option value="refinance">Refinance</option>
                  <option value="cash_out">Cash Out</option>
                  <option value="construction">Construction</option>
                </select>
              </div>

              <div>
                <label className="label">Loan Type</label>
                <select
                  name="loan_type"
                  value={formData.loan_type}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="bridge">Bridge</option>
                  <option value="term">Term</option>
                  <option value="construction">Construction</option>
                  <option value="perm">Permanent</option>
                </select>
              </div>

              <div>
                <label className="label">Requested LTV (%)</label>
                <input
                  type="number"
                  name="requested_ltv"
                  value={formData.requested_ltv}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  className="input"
                  placeholder="e.g., 75"
                />
              </div>

              <div>
                <label className="label">Requested Rate (%)</label>
                <input
                  type="number"
                  name="requested_rate"
                  value={formData.requested_rate}
                  onChange={handleChange}
                  min="0"
                  max="30"
                  step="0.01"
                  className="input"
                  placeholder="e.g., 8.25"
                />
              </div>

              <div>
                <label className="label">Requested Term (months)</label>
                <input
                  type="number"
                  name="requested_term_months"
                  value={formData.requested_term_months}
                  onChange={handleChange}
                  min="1"
                  className="input"
                  placeholder="e.g., 24"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-8">
            <label className="label">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="input"
              placeholder="Additional notes or comments..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Deal'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
