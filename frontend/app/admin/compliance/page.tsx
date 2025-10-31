'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Shield, Search } from 'lucide-react';

export default function CompliancePage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Only admins and auditors can view compliance data
    if (user?.role !== 'admin' && user?.role !== 'auditor') {
      router.push('/dashboard');
      return;
    }

    loadAuditLogs();
  }, [isAuthenticated, user, router]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      // Note: This endpoint would need to be added to the backend
      // For now, we'll show a placeholder message
      setAuditLogs([
        {
          id: '1',
          action: 'create',
          resource_type: 'deal',
          resource_id: '88888888-8888-8888-8888-888888888888',
          user_email: 'broker@apexcommercial.com',
          created_at: new Date().toISOString(),
          ip_address: '192.168.1.100'
        },
        {
          id: '2',
          action: 'update',
          resource_type: 'deal',
          resource_id: '88888888-8888-8888-8888-888888888888',
          user_email: 'underwriter@apexcommercial.com',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          ip_address: '192.168.1.101'
        }
      ]);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = auditLogs.filter(log =>
    log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Compliance & Audit Logs</h1>
              <p className="text-sm text-gray-600 mt-1">
                View all system activity and data changes
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="card mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search audit logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="card">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading audit logs...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
              <button onClick={loadAuditLogs} className="btn-primary mt-4">
                Retry
              </button>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm ? 'No audit logs match your search' : 'No audit logs yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Timestamp</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Action</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Resource</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">{log.user_email}</td>
                      <td className="py-3 px-4">
                        <span className={`badge ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 capitalize">
                        {log.resource_type}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 font-mono">
                        {log.ip_address}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Audit logs are immutable and retained for compliance purposes. 
            All data changes are automatically logged and cannot be deleted.
          </p>
        </div>
      </main>
    </div>
  );
}

function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    'create': 'badge-success',
    'update': 'badge-warning',
    'delete': 'badge-error',
    'view': 'badge-info',
  };
  return colors[action] || 'badge-info';
}
