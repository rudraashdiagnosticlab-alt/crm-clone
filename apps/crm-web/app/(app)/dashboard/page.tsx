'use client';

import { useQuery } from '@tanstack/react-query';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { leadsApi, type Lead } from '@/lib/leads';
import { metricsApi } from '@/lib/crm';
import { WidgetCard, type Column } from '@/components/dashboard/widget-card';

// ── Sample widget data (Phase 0). Tasks/Meetings/Deals APIs arrive later. ──
interface Task {
  subject: string;
  dueDate: string;
  status: string;
  priority: string;
}
const OPEN_TASKS: Task[] = [
  { subject: 'Register for upcoming CRM Webinars', dueDate: '27/05/2026', status: 'Not Started', priority: 'Low' },
  { subject: 'Refer CRM Videos', dueDate: '29/05/2026', status: 'In Progress', priority: 'Normal' },
  { subject: 'Competitor Comparison Document', dueDate: '25/05/2026', status: 'Not Started', priority: 'Highest' },
  { subject: 'Get Approval from Manager', dueDate: '26/05/2026', status: 'Not Started', priority: 'Low' },
  { subject: 'Get Approval from Manager', dueDate: '28/05/2026', status: 'In Progress', priority: 'Normal' },
  { subject: 'Get Approval from Manager', dueDate: '28/05/2026', status: 'In Progress', priority: 'High' },
];

interface Meeting {
  title: string;
  from: string;
  to: string;
  relatedTo: string;
}
const MEETINGS: Meeting[] = [
  { title: 'Demo', from: '27/05/2026 08:22 PM', to: '27/05/2026 09:22 PM', relatedTo: 'Printing Dimensions' },
  { title: 'Webinar', from: '27/05/2026 10:22 PM', to: '27/05/2026 11:22 PM', relatedTo: 'Commercial Press' },
  { title: 'TradeShow', from: '27/05/2026', to: '28/05/2026', relatedTo: 'Chemel' },
  { title: 'Webinar', from: '27/05/2026 09:22 PM', to: '28/05/2026 12:22 AM', relatedTo: 'Chanay (Sample)' },
  { title: 'Seminar', from: '27/05/2026 08:22 PM', to: '27/05/2026 10:22 PM', relatedTo: 'Carissa Kidman' },
  { title: 'Attend Customer conference', from: '27/05/2026', to: '27/05/2026', relatedTo: 'Feltz Printing' },
];

interface Deal {
  name: string;
  amount: string;
  stage: string;
  closing: string;
}
const DEALS: Deal[] = [
  { name: 'Printing Dimensions', amount: 'Rs. 25,000.00', stage: 'Proposal/Price Quote', closing: 'May 29' },
];

const PRIORITY_STYLE: Record<string, string> = {
  Highest: 'text-red-600',
  High: 'text-orange-600',
  Normal: 'text-foreground',
  Low: 'text-muted-foreground',
};

const taskColumns: Column<Task>[] = [
  { key: 'subject', header: 'Subject' },
  { key: 'dueDate', header: 'Due Date' },
  { key: 'status', header: 'Status' },
  {
    key: 'priority',
    header: 'Priority',
    cell: (r) => <span className={PRIORITY_STYLE[r.priority] ?? ''}>{r.priority}</span>,
  },
];

const meetingColumns: Column<Meeting>[] = [
  { key: 'title', header: 'Title' },
  { key: 'from', header: 'From' },
  { key: 'to', header: 'To' },
  { key: 'relatedTo', header: 'Related To' },
];

const dealColumns: Column<Deal>[] = [
  {
    key: 'closing',
    header: '',
    cell: (r) => (
      <span className="inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        {r.closing}
      </span>
    ),
  },
  { key: 'name', header: 'Deal Name' },
  { key: 'amount', header: 'Amount', className: 'text-right' },
  { key: 'stage', header: 'Stage' },
];

const leadColumns: Column<Lead>[] = [
  { key: 'businessName', header: 'Lead Name', cell: (r) => r.businessName },
  { key: 'city', header: 'Company', cell: (r) => `${r.city}, ${r.state}` },
  { key: 'email', header: 'Email', cell: (r) => r.email ?? '—' },
  { key: 'phone', header: 'Phone' },
];

export default function DashboardPage() {
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/auth/me')).data,
    retry: false,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', 'today'],
    queryFn: leadsApi.list,
    retry: false,
  });

  const { data: summary } = useQuery({
    queryKey: ['metrics', 'summary'],
    queryFn: metricsApi.summary,
    retry: false,
  });

  // DSH-001..004 — KPI cards from live metrics
  const KPIS = [
    { label: 'Total Leads', value: (summary?.totalLeads ?? 0).toLocaleString() },
    { label: 'Planned Leads', value: (summary?.plannedLeads ?? 0).toLocaleString() },
    { label: 'Balance Leads', value: (summary?.balanceLeads ?? 0).toLocaleString() },
    { label: 'Progress %', value: `${summary?.progressPct ?? 0}%` },
  ];

  const name = me?.name ?? me?.email?.split('@')[0] ?? 'there';
  const today = new Date().toDateString();
  const todaysLeads = leads.filter((l) => new Date(l.createdAt).toDateString() === today);

  return (
    <div className="space-y-6">
      {/* Welcome sub-header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <span className="text-lg font-semibold">{name.charAt(0).toUpperCase()}</span>
          </div>
          <h2 className="text-xl font-semibold capitalize">Welcome {name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-md border bg-card text-muted-foreground hover:text-foreground"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm font-medium">
            <span className="capitalize">{name}&apos;s Home</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* KPI cards (DSH-006) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-lg border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* 2×2 widget grid */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <WidgetCard title="My Open Tasks" columns={taskColumns} rows={OPEN_TASKS} />
        <WidgetCard title="My Meetings" columns={meetingColumns} rows={MEETINGS} />
        <WidgetCard
          title="Today's Leads"
          columns={leadColumns}
          rows={todaysLeads}
          emptyMessage="No Leads found."
        />
        <WidgetCard title="My Deals Closing This Month" columns={dealColumns} rows={DEALS} />
      </div>
    </div>
  );
}
