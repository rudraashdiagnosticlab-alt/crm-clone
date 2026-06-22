'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users, Shield, UserCheck, Phone, Check, Pencil, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHead, Avatar } from '@/components/page-head';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { FilterSelect, SearchInput } from '@/components/filter-controls';

interface User { id: string; name: string; email: string; role: 'admin' | 'team_leader' | 'employee'; isActive: boolean; createdAt: string }

const ROLE_META: Record<string, { label: string; cls: string; desc: string; perms: string[] }> = {
  admin: { label: 'Admin', cls: 'bg-[#f7e3da] text-[#a8431f]', desc: 'Full access to all modules, data, settings, and user management.', perms: ['All modules & settings', 'User management', 'Recordings & exports', 'System configuration'] },
  team_leader: { label: 'Team Leader', cls: 'bg-[#dff0ec] text-[#2f6f63]', desc: 'Assign leads, monitor team performance, and view team reports.', perms: ['Assign & distribute leads', 'Monitor live team', 'Team reports & recordings', 'No system settings'] },
  employee: { label: 'Sales Caller', cls: 'bg-[#e7eed8] text-[#42512f]', desc: 'Work assigned leads — update status, add notes, and log calls.', perms: ['Assigned leads only', 'Make & log calls', 'Add notes & follow-ups', 'No team data access'] },
};

const ROLE_OPTS = [
  { label: 'All Roles', value: '' },
  { label: 'Admin', value: 'admin' },
  { label: 'Team Leader', value: 'team_leader' },
  { label: 'Sales Caller', value: 'employee' },
];

export default function UsersPage() {
  const { data: users = [] } = useQuery<User[]>({ queryKey: ['users'], queryFn: async () => (await api.get('/users')).data, retry: false });
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const count = (r: string) => users.filter((u) => u.role === r).length;

  const term = q.trim().toLowerCase();
  const shown = users.filter(
    (u) =>
      (!role || u.role === role) &&
      (!term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)),
  );

  return (
    <div>
      <PageHead lead="Manage team members, roles, and access permissions across the organization.">
        <button className="inline-flex items-center gap-2 rounded-md bg-primary px-[15px] py-[9px] text-[13px] font-semibold text-primary-foreground hover:opacity-90"><Plus className="h-4 w-4" /> Add User</button>
      </PageHead>

      <div className="mb-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <KpiCard icon={Users} iconBg="#e7eed8" iconColor="#42512f" value={users.length} label="Total Users" />
        <KpiCard icon={Shield} iconBg="#fdecdc" iconColor="#c98a18" value={count('admin')} label="Admins" />
        <KpiCard icon={UserCheck} iconBg="#dff0ec" iconColor="#2f6f63" value={count('team_leader')} label="Team Leaders" />
        <KpiCard icon={Phone} iconBg="#e7eed8" iconColor="#42512f" value={count('employee')} label="Sales Callers" />
      </div>

      <div className="mb-5 grid gap-[18px] md:grid-cols-3">
        {Object.entries(ROLE_META).map(([role, m]) => (
          <div key={role} className="rounded-2xl border bg-card p-[18px] shadow-sm">
            <div className="mb-2.5 flex items-center justify-between"><span className={`rounded-full px-2.5 py-[3px] text-[11.5px] font-bold ${m.cls}`}>{m.label}</span><span className="text-[12px] text-muted-foreground">{count(role)} {count(role) === 1 ? 'user' : 'users'}</span></div>
            <div className="mb-3.5 text-[13px] text-muted-foreground">{m.desc}</div>
            <div className="flex flex-col gap-2.5">{m.perms.map((p) => <div key={p} className="flex items-center gap-2.5 text-[13px] font-medium"><Check className="h-[15px] w-[15px] shrink-0 text-[#3f7a32]" />{p}</div>)}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-[18px] py-4">
          <div><h3 className="font-display text-[15px] font-semibold">All Users</h3><div className="text-xs text-muted-foreground">{shown.length} {shown.length === 1 ? 'member' : 'members'}</div></div>
          <div className="flex flex-wrap items-center gap-2.5">
            <SearchInput value={q} onChange={setQ} placeholder="Search name or email…" className="min-w-[220px]" />
            <FilterSelect icon={Filter} value={role} onChange={setRole} options={ROLE_OPTS} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b bg-background text-left text-[11px] uppercase tracking-[.06em] text-muted-foreground">{['User', 'Role', 'Status', 'Created', ''].map((h) => <th key={h} className="px-4 py-[11px] font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3"><div className="flex items-center gap-[10px]"><Avatar name={u.name} /><div><div className="font-semibold">{u.name}</div><div className="text-[11.5px] text-muted-foreground">{u.email}</div></div></div></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-[3px] text-[11.5px] font-bold ${ROLE_META[u.role].cls}`}>{ROLE_META[u.role].label}</span></td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold ${u.isActive ? 'bg-[#e7eed8] text-[#42512f]' : 'bg-[#e7f0f8] text-[#2c5d8f]'}`}><span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><button className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"><Pencil className="h-4 w-4" /></button></td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{users.length === 0 ? 'Could not load users (admin role required).' : 'No users match the current filters.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
