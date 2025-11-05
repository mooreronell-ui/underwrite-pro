import apiClient from './api-client';

export type Org = { id: string; name: string; role: 'owner' | 'member'; is_active: boolean; };

export async function apiGet(path: string): Promise<any> {
  const response = await apiClient.get(path);
  return response.data;
}

export async function apiPost(path: string, body: any): Promise<any> {
  const response = await apiClient.post(path, body);
  return response.data;
}

export async function getMyOrgs(): Promise<{ orgs: Org[]; activeOrgId: string | null }> {
  const res = await apiGet('/api/orgs/mine');
  if (!res.ok) throw new Error(res.error || 'Failed to fetch organizations.');
  const active = (res.orgs || []).find((o: Org) => o.is_active) || null;
  return { orgs: res.orgs || [], activeOrgId: active ? active.id : null };
}

export async function createOrg(name: string): Promise<Org> {
  const res = await apiPost('/api/orgs', { name });
  if (!res.ok) throw new Error(res.error || 'Failed to create organization.');
  return { id: res.id, name: res.name, role: 'owner', is_active: true };
}

export async function activateOrg(id: string): Promise<boolean> {
  const res = await apiPost(`/api/orgs/${id}/activate`, {});
  if (!res.ok) throw new Error(res.error || 'Failed to set active organization.');
  return true;
}
