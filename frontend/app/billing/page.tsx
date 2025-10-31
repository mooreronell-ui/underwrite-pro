'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { CreditCard, CheckCircle } from 'lucide-react';

export default function BillingPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Only admins can view billing
    if (user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, user, router]);

  // Check if Stripe is configured
  const stripeConfigured = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage your subscription and payment methods
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Plan */}
        <div className="card mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Current Plan</h2>
              <p className="text-sm text-gray-600 mt-1">Professional Plan</p>
            </div>
            <span className="badge badge-success">Active</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Monthly Price</p>
              <p className="text-2xl font-bold text-gray-900">$299</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Billing Cycle</p>
              <p className="text-lg font-medium text-gray-900">Monthly</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Next Billing Date</p>
              <p className="text-lg font-medium text-gray-900">
                {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Plan Features</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Unlimited deals
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Advanced underwriting analytics
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-600" />
                DocuSign integration
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Priority support
              </li>
            </ul>
          </div>
        </div>

        {/* Payment Method */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Method</h2>
          
          {stripeConfigured ? (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">•••• •••• •••• 4242</p>
                  <p className="text-sm text-gray-600">Expires 12/25</p>
                </div>
              </div>
              <button className="btn-secondary">Update</button>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Stripe is not configured. Please add your Stripe API keys to enable payment processing.
              </p>
            </div>
          )}
        </div>

        {/* Billing History */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing History</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Description</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Invoice</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {new Date().toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">Professional Plan</td>
                  <td className="py-3 px-4 text-sm text-gray-900">$299.00</td>
                  <td className="py-3 px-4">
                    <span className="badge badge-success">Paid</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      Download
                    </button>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">Professional Plan</td>
                  <td className="py-3 px-4 text-sm text-gray-900">$299.00</td>
                  <td className="py-3 px-4">
                    <span className="badge badge-success">Paid</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      Download
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <button className="btn-secondary">Change Plan</button>
          <button className="btn-secondary text-red-600 hover:bg-red-50">Cancel Subscription</button>
        </div>
      </main>
    </div>
  );
}
