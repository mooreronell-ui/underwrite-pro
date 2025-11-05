"use client";
import { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getMyOrgs, createOrg, activateOrg, Org } from '@/lib/org-api';
import { useAuth } from '@/hooks/useAuth';

export default function OrgSwitcher() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [newOrgName, setNewOrgName] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setErr(null);
      const { orgs, activeOrgId } = await getMyOrgs();
      setOrgs(orgs);
      setActiveOrgId(activeOrgId);
    } catch (e:any) {
      setErr(e.message || 'Error loading orgs.');
    }
  }, []);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) return;
    try {
      setErr(null);
      await activateOrg(id);
      setActiveOrgId(id);
      startTransition(() => router.refresh());
    } catch (e:any) {
      setErr(e.message || 'Error switching organization.');
    }
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newOrgName.length < 3) return;
    try {
      setErr(null);
      await createOrg(newOrgName);
      setNewOrgName('');
      await load();
      startTransition(() => router.refresh());
    } catch (e:any) {
      setErr(e.message || 'Error creating organization.');
    }
  };

  if (!isAuthenticated) return null;

  if (orgs.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <form onSubmit={onCreate} className="flex space-x-1">
          <input className="p-1 border text-sm" placeholder="New Org Name" value={newOrgName} onChange={e=>setNewOrgName(e.target.value)} disabled={isPending}/>
          <button className="px-2 py-1 bg-blue-600 text-white text-sm rounded" disabled={isPending || newOrgName.length<3}>
            {isPending ? 'Creating...' : 'Create Org'}
          </button>
        </form>
        {err && <p className="text-xs text-red-500">{err}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="org-switcher" className="text-sm font-medium">Active Org:</label>
      <select id="org-switcher" className="p-1 border rounded text-sm" value={activeOrgId || ''} onChange={onChange} disabled={isPending}>
        {orgs.map(o => (<option key={o.id} value={o.id}>{o.name}</option>))}
      </select>
      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  );
}
