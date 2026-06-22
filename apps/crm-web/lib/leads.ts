import { api } from './api';

export type QuoStatus = 'not_synced' | 'pending' | 'synced' | 'failed';

export interface Lead {
  id: string;
  leadId: string;
  businessName: string;
  phone: string;
  email: string | null;
  state: string;
  city: string;
  timezone: string;
  status: string;
  // ── Lead sheet fields ──
  contactName: string | null;
  industry: string | null;
  title: string | null;
  vlc: string | null;
  employeeCode: string | null;
  comments: string | null;
  leadCategory: string | null;
  nextFollowUpDate: string | null;
  assignedTo: { id: string; name: string; email: string } | null;
  quoStatus: QuoStatus;
  quoExternalId: string | null;
  quoResponse: unknown;
  quoError: string | null;
  quoSyncedAt: string | null;
  createdAt: string;
}

export interface QuoSyncLog {
  id: string;
  success: boolean;
  statusCode: number | null;
  request: unknown;
  response: unknown;
  error: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface CreateLeadInput {
  businessName: string;
  phone: string;
  email?: string;
  state: string;
  city: string;
  timezone?: string;
  // ── Lead sheet fields ──
  contactName?: string;
  industry?: string;
  title?: string;
  vlc?: string;
  employeeCode?: string;
  comments?: string;
  leadCategory?: string;
  nextFollowUpDate?: string;
  caller?: string;
}

export const leadsApi = {
  list: async (): Promise<Lead[]> => (await api.get('/leads')).data,
  get: async (id: string): Promise<Lead> => (await api.get(`/leads/${id}`)).data,
  create: async (input: CreateLeadInput): Promise<Lead> => (await api.post('/leads', input)).data,
  syncToQuo: async (id: string) => (await api.post(`/leads/${id}/quo-sync`)).data,
  quoLogs: async (id: string): Promise<QuoSyncLog[]> => (await api.get(`/leads/${id}/quo-logs`)).data,
};
