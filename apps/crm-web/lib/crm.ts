import { api } from './api';
import type { Lead } from './leads';

// ─────────────────────────── Metrics ───────────────────────────
export interface MetricsSummary {
  totalLeads: number;
  plannedLeads: number;
  balanceLeads: number;
  progressPct: number;
  closedLeads: number;
}
export interface TimezoneCount {
  timezone: string;
  count: number;
}
export interface PivotCity {
  city: string;
  total: number;
  planned: number;
  balance: number;
  progressPct: number;
}
export interface PivotState extends Omit<PivotCity, 'city'> {
  state: string;
  cities: PivotCity[];
}
export interface PivotTimezone extends Omit<PivotCity, 'city'> {
  timezone: string;
  states: PivotState[];
}

export interface StateMetric {
  state: string;
  timezone: string;
  total: number;
  planned: number;
  balance: number;
  progressPct: number;
}
export interface DailyPoint {
  date: string;
  count: number;
}
export interface BarPoint {
  name: string;
  value: number;
}

export interface MetricsRange {
  from?: string;
  to?: string;
}
export const metricsApi = {
  summary: async (params?: MetricsRange): Promise<MetricsSummary> => (await api.get('/metrics/summary', { params })).data,
  byTimezone: async (): Promise<TimezoneCount[]> => (await api.get('/metrics/by-timezone')).data,
  byState: async (): Promise<StateMetric[]> => (await api.get('/metrics/by-state')).data,
  daily: async (): Promise<DailyPoint[]> => (await api.get('/metrics/daily')).data,
  bar: async (): Promise<BarPoint[]> => (await api.get('/metrics/bar')).data,
  pivot: async (): Promise<PivotTimezone[]> => (await api.get('/metrics/pivot')).data,
};

// ─────────────────────────── Targets ───────────────────────────
export interface Target {
  id: string;
  state: string;
  city: string;
  timezone: string;
  monthlyTarget: number;
}
export const targetsApi = {
  list: async (): Promise<Target[]> => (await api.get('/targets')).data,
  upsert: async (t: Omit<Target, 'id'>) => (await api.post('/targets', t)).data,
};

// ───────────────────────── Assignments ─────────────────────────
export interface AssignmentSummary {
  unassigned: number;
  callers: { id: string; name: string; email: string; leadCount: number }[];
}
export const assignmentsApi = {
  summary: async (): Promise<AssignmentSummary> => (await api.get('/assignments/summary')).data,
  auto: async (body: { callerIds: string[]; strategy: 'equal' | 'state' | 'timezone'; timezone?: string; state?: string }) =>
    (await api.post('/assignments/auto', body)).data,
};

// ─────────────────────────── Calls ─────────────────────────────
export interface CallerDashboard {
  assignedLeads: number;
  callsCompleted: number;
  pendingLeads: number;
  productiveSecs: number;
  avgCallSecs: number;
}
export type CallOutcome =
  | 'callback'
  | 'interested'
  | 'no_answer'
  | 'busy'
  | 'wrong_number'
  | 'closed_deal'
  | 'follow_up_required';

export interface Followup {
  id: string;
  noteText: string;
  nextFollowupDate: string;
  caller: string | null;
  lead: { id: string; businessName: string; phone: string; city: string; state: string; timezone: string; status: string } | null;
}

export const callsApi = {
  dashboard: async (): Promise<CallerDashboard> => (await api.get('/calls/caller/dashboard')).data,
  myLeads: async (): Promise<Lead[]> => (await api.get('/calls/caller/leads')).data,
  followups: async (): Promise<Followup[]> => (await api.get('/calls/followups')).data,
  start: async (leadId: string) => (await api.post('/calls/start', { leadId })).data,
  end: async (callId: string, outcome: CallOutcome, durationSecs?: number) =>
    (await api.post(`/calls/${callId}/end`, { outcome, durationSecs })).data,
  addNote: async (callId: string, noteText: string, nextFollowupDate?: string) =>
    (await api.post(`/calls/${callId}/notes`, { noteText, nextFollowupDate })).data,
};

// ───────────────────────── Productivity ─────────────────────────
export interface CallerProductivity {
  id: string;
  name: string;
  email: string;
  callsToday: number;
  leadsCompleted: number;
  assigned: number;
  conversionPct: number;
  productiveSecs: number;
  workHours: number;
}
export interface TeamLive {
  kpis: {
    totalCallsToday: number;
    totalTalkSecs: number;
    conversionRate: number;
    bestPerformer: { name: string; calls: number } | null;
  };
  team: { id: string; name: string; status: string }[];
}
export interface DailySummaryRow {
  id: string;
  name: string;
  callsMade: number;
  connected: number;
  callbacks: number;
  deals: number;
}
export type Period = 'day' | 'week' | 'month';
export const productivityApi = {
  perCaller: async (period: Period = 'day'): Promise<CallerProductivity[]> => (await api.get('/productivity', { params: { period } })).data,
  teamLive: async (): Promise<TeamLive> => (await api.get('/productivity/team-live')).data,
  dailySummary: async (): Promise<DailySummaryRow[]> => (await api.get('/productivity/daily-summary')).data,
};

// ──────────────────────── Activities ───────────────────────────
export interface Activity {
  id: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
  lead: { id: string; businessName: string } | null;
}
export const activitiesApi = {
  list: async (): Promise<Activity[]> => (await api.get('/activities')).data,
};

// ───────────────────────── Notifications ────────────────────────
export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}
export const notificationsApi = {
  list: async (): Promise<Notification[]> => (await api.get('/notifications')).data,
  unreadCount: async (): Promise<{ count: number }> => (await api.get('/notifications/unread-count')).data,
  markAllRead: async () => (await api.post('/notifications/read-all')).data,
};

// ─────────────────────────── Tasks ─────────────────────────────
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'high' | 'medium' | 'low';
export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
}
export const tasksApi = {
  list: async (): Promise<Task[]> => (await api.get('/tasks')).data,
  create: async (title: string, priority: TaskPriority = 'medium'): Promise<Task> =>
    (await api.post('/tasks', { title, priority })).data,
  setStatus: async (id: string, status: TaskStatus): Promise<Task> =>
    (await api.patch(`/tasks/${id}`, { status })).data,
  remove: async (id: string) => (await api.delete(`/tasks/${id}`)).data,
};

// ────────────────────────── Calendar ───────────────────────────
export interface CalendarEvent {
  day: number;
  date: string;
  type: 'call' | 'fu' | 'task';
  label: string;
}
export const calendarApi = {
  events: async (year: number, month: number): Promise<CalendarEvent[]> =>
    (await api.get('/calendar/events', { params: { year, month } })).data,
};

// ─────────────────────────── Config ────────────────────────────
export interface ConfigStatus {
  database: { provider: string; configured: boolean };
  calling: { provider: string; configured: boolean };
  ai: { provider: string; model: string | null; configured: boolean };
  quo: { configured: boolean; sandbox: boolean };
  openphone: { provider: string; configured: boolean; sandbox: boolean };
  storage: { provider: string; configured: boolean };
  redis: { configured: boolean };
}
export const configApi = {
  status: async (): Promise<ConfigStatus> => (await api.get('/config/status')).data,
};

export interface OpenPhoneStatus {
  provider: string;
  sandbox: boolean;
  connected: boolean;
  phoneNumbers: { id: string; number: string; name?: string }[];
  error: string | null;
}
export const openphoneApi = {
  status: async (): Promise<OpenPhoneStatus> => (await api.get('/openphone/status')).data,
};

export interface TimelineItem {
  kind: 'call' | 'message' | 'note';
  id: string;
  at: string;
  direction?: 'inbound' | 'outbound';
  status?: string | null;
  durationSecs?: number | null;
  recordingUrl?: string | null;
  transcript?: string | null;
  aiSummary?: string | null;
  body?: string;
  by?: string | null;
}
export const communicationsApi = {
  timeline: async (leadId: string): Promise<TimelineItem[]> =>
    (await api.get(`/communications/lead/${leadId}`)).data,
  sendSms: async (leadId: string, body: string): Promise<{ success: boolean; error: string | null }> =>
    (await api.post(`/communications/lead/${leadId}/sms`, { body })).data,
  startCall: async (leadId: string): Promise<{ callId: string; tel: string; phone: string }> =>
    (await api.post(`/communications/lead/${leadId}/call`, {})).data,
  latestIncoming: async (): Promise<IncomingCall | null> =>
    (await api.get('/communications/incoming/latest')).data,
  analytics: async (period = 'week'): Promise<CommAnalytics> =>
    (await api.get('/communications/analytics', { params: { period } })).data,
};

export interface IncomingCall {
  callId: string;
  at: string;
  status: string | null;
  lead: { id: string; businessName: string; phone: string; city: string; state: string; status: string };
}
export interface CommAnalytics {
  period: string;
  calls: { total: number; inbound: number; outbound: number; missed: number; avgDurationSecs: number; totalTalkSecs: number };
  messages: { total: number; inbound: number; outbound: number };
  series: { date: string; calls: number; messages: number }[];
}

export interface IntegrationStatus {
  openphone: { provider: string; configured: boolean; sandbox: boolean; baseUrl: string; apiKeyHint: string | null };
  quo: { provider: string; configured: boolean; sandbox: boolean; baseUrl: string; apiKeyHint: string | null };
}
export const integrationsApi = {
  status: async (): Promise<IntegrationStatus> => (await api.get('/integrations/status')).data,
  connectOpenPhone: async (apiKey: string, baseUrl?: string, webhookSecret?: string) =>
    (await api.put('/integrations/openphone', { apiKey, baseUrl, webhookSecret })).data,
  connectQuo: async (baseUrl: string, apiKey: string) =>
    (await api.put('/integrations/quo', { baseUrl, apiKey })).data,
  disconnect: async (provider: 'openphone' | 'quo') =>
    (await api.delete(`/integrations/${provider}`)).data,
};

// ──────────────────────────── AI ───────────────────────────────
export interface AiInsights {
  bestStateToday: { state: string; timezone: string; total: number; conversionPct: number } | null;
  bestTimezone: { timezone: string; total: number; conversionPct: number } | null;
  targetPrediction: {
    totalLeads: number;
    plannedLeads: number;
    overallProgressPct: number;
    note: string;
  };
}
export const aiApi = {
  chat: async (question: string): Promise<{ answer: string; topic: string | null }> =>
    (await api.post('/ai/chat', { question })).data,
  insights: async (): Promise<AiInsights> => (await api.get('/ai/insights')).data,
};

// ────────────────────────── Import ─────────────────────────────
export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  totalRows: number;
  errors: { row: number; reason: string }[];
}
export interface LeadRow {
  businessName: string;
  phone: string;
  email?: string;
  state: string;
  city: string;
  timezone?: string;
  status?: string;
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
export const importApi = {
  bulk: async (rows: LeadRow[]): Promise<ImportResult> => (await api.post('/leads/import', { rows })).data,
};

/** Format seconds as "5h 10m" / "2m 40s". */
export function formatDuration(secs: number): string {
  if (secs <= 0) return '0s';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
