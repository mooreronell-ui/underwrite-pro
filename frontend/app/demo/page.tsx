"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://underwrite-pro-api.onrender.com";
const FEATURE_DEMO = process.env.NEXT_PUBLIC_FEATURE_DEMO || "true";

type Deal = {
  id: string;
  name: string;
  loan_amount: number;
  asset_type: string;
  status: string;
  created_at: string;
};

export default function DemoDashboardPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState("unknown");

  // Check feature flag
  useEffect(() => {
    if (FEATURE_DEMO === "false") {
      router.push("/404");
    }
  }, [router]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        // check API
        try {
          const health = await fetch(`${API_BASE}/health`);
          if (health.ok) {
            setApiStatus("healthy");
          } else {
            setApiStatus("unhealthy");
          }
        } catch (e) {
          setApiStatus("unreachable");
        }

        const res = await fetch(`${API_BASE}/api/deals/public`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Failed to load deals");
        }
        setDeals(json.deals || []);
      } catch (e: any) {
        setError(e.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalDeals = deals.length;
  const totalLoanAmount = deals.reduce((sum, d) => sum + (d.loan_amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold">Underwrite Pro — Demo</h1>
          <p className="text-slate-400 text-sm">
            Public read-only view. Data from /api/deals/public
          </p>
        </div>
        <a
          href="/login"
          className="text-sm bg-emerald-500 text-slate-950 rounded px-3 py-1 font-medium hover:bg-emerald-400"
        >
          Sign in
        </a>
      </header>

      <main className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">API Status</p>
            <p className={`text-lg font-semibold mt-2 ${
              apiStatus === "healthy" ? "text-emerald-400" : "text-amber-300"
            }`}>
              {apiStatus}
            </p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total Deals</p>
            <p className="text-lg font-semibold mt-2">{totalDeals}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total Loan Amount</p>
            <p className="text-lg font-semibold mt-2">
              ${totalLoanAmount.toLocaleString("en-US")}
            </p>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h2 className="font-medium">Recent Deals</h2>
            {loading ? <span className="text-xs text-slate-400">Loading…</span> : null}
          </div>

          {error ? (
            <div className="p-4 text-sm text-red-300 bg-red-500/5">{error}</div>
          ) : null}

          {!loading && deals.length === 0 ? (
            <div className="p-4 text-sm text-slate-400">
              No demo deals found. Add more in Supabase → deals.
            </div>
          ) : null}

          {deals.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="text-left px-4 py-2 text-slate-300">Name</th>
                  <th className="text-left px-4 py-2 text-slate-300">Loan Amount</th>
                  <th className="text-left px-4 py-2 text-slate-300">Asset</th>
                  <th className="text-left px-4 py-2 text-slate-300">Status</th>
                  <th className="text-left px-4 py-2 text-slate-300">Created</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id} className="border-t border-slate-800">
                    <td className="px-4 py-2">{deal.name}</td>
                    <td className="px-4 py-2">
                      {deal.loan_amount
                        ? `$${deal.loan_amount.toLocaleString("en-US")}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-300">{deal.asset_type || "—"}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-800 text-xs">
                        {deal.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-400 text-xs">
                      {new Date(deal.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </main>
    </div>
  );
}
