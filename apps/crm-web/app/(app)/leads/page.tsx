'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leadsApi, type CreateLeadInput } from '@/lib/leads';
import { QuoStatusBadge } from '@/components/quo-status-badge';

const EMPTY: CreateLeadInput = {
  businessName: '',
  phone: '',
  email: '',
  state: '',
  city: '',
  timezone: 'EST',
};

export default function LeadsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateLeadInput>(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: leadsApi.list,
  });

  const create = useMutation({
    mutationFn: () => leadsApi.create({ ...form, email: form.email || undefined }),
    onSuccess: (lead) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      router.push(`/leads/${lead.id}`); // straight to detail to send to Quo
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {leads.length} lead{leads.length === 1 ? '' : 's'} · click a row to open detail
        </p>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          {showForm ? 'Close' : '+ Create Lead'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
        >
          {(
            [
              ['businessName', 'Business Name *'],
              ['phone', 'Phone *'],
              ['email', 'Email'],
              ['state', 'State *'],
              ['city', 'City *'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="space-y-1 text-sm">
              <span className="font-medium">{label}</span>
              <input
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={label.includes('*')}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
          ))}
          <label className="space-y-1 text-sm">
            <span className="font-medium">Timezone</span>
            <select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              {['EST', 'CST', 'MST', 'PST'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <div className="col-span-full flex items-center gap-3">
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {create.isPending ? 'Creating…' : 'Create & open'}
            </button>
            {create.isError && (
              <span className="text-sm text-red-500">
                {(create.error as any)?.response?.data?.message ?? 'Failed to create lead'}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              Tip: phone ending in <code>0000</code> simulates a Quo rejection.
            </span>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Business</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Location</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Quo</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && leads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No leads yet — create one above.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => router.push(`/leads/${lead.id}`)}
                className="cursor-pointer border-t hover:bg-muted/40"
              >
                <td className="px-4 py-2 font-medium">{lead.businessName}</td>
                <td className="px-4 py-2">{lead.phone}</td>
                <td className="px-4 py-2">
                  {lead.city}, {lead.state} · {lead.timezone}
                </td>
                <td className="px-4 py-2 capitalize">{lead.status.replace('_', ' ')}</td>
                <td className="px-4 py-2">
                  <QuoStatusBadge status={lead.quoStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
