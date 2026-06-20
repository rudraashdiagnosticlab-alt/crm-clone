'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { importApi, type LeadRow } from '@/lib/crm';

// Map flexible CSV headers → our row fields.
const FIELD_ALIASES: Record<keyof LeadRow, string[]> = {
  businessName: ['business name', 'businessname', 'business', 'company'],
  phone: ['phone', 'phone number', 'mobile'],
  email: ['email', 'e-mail'],
  state: ['state'],
  city: ['city'],
  timezone: ['timezone', 'time zone', 'tz'],
};

function parseCsv(text: string): LeadRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (field: keyof LeadRow) => headers.findIndex((h) => FIELD_ALIASES[field].includes(h));
  const cols = {
    businessName: idx('businessName'),
    phone: idx('phone'),
    email: idx('email'),
    state: idx('state'),
    city: idx('city'),
    timezone: idx('timezone'),
  };
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    return {
      businessName: cols.businessName >= 0 ? cells[cols.businessName] : '',
      phone: cols.phone >= 0 ? cells[cols.phone] : '',
      email: cols.email >= 0 ? cells[cols.email] : undefined,
      state: cols.state >= 0 ? cells[cols.state] : '',
      city: cols.city >= 0 ? cells[cols.city] : '',
      timezone: cols.timezone >= 0 ? cells[cols.timezone] : undefined,
    };
  });
}

const SAMPLE = `Business Name,Phone,Email,State,City,Timezone
Acme Tax LLC,+13055551234,info@acme.com,Florida,Miami,EST
Bay Books Inc,+14155559876,hi@baybooks.com,California,San Francisco,PST`;

export default function ImportPage() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [raw, setRaw] = useState('');

  const importMut = useMutation({
    mutationFn: () => importApi.bulk(rows),
  });

  function loadText(text: string) {
    setRaw(text);
    setRows(parseCsv(text));
    importMut.reset();
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Paste or upload CSV (headers: Business Name, Phone, Email, State, City, Timezone). Preview, then import (IMP-001..005, dedupe AI-004).
      </p>

      <div className="flex items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted">
          <Upload className="h-4 w-4" /> Upload CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) f.text().then(loadText);
            }}
          />
        </label>
        <button
          onClick={() => loadText(SAMPLE)}
          className="rounded-md border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          Load sample
        </button>
      </div>

      <textarea
        value={raw}
        onChange={(e) => loadText(e.target.value)}
        placeholder="…or paste CSV here"
        rows={5}
        className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
      />

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Preview — {rows.length} rows (first 10 shown)</p>
            <button
              onClick={() => importMut.mutate()}
              disabled={importMut.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {importMut.isPending ? 'Importing…' : `Import ${rows.length} leads`}
            </button>
          </div>
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Business</th>
                  <th className="px-4 py-2 font-medium">Phone</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">State</th>
                  <th className="px-4 py-2 font-medium">City</th>
                  <th className="px-4 py-2 font-medium">TZ</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-2">{r.businessName}</td>
                    <td className="px-4 py-2">{r.phone}</td>
                    <td className="px-4 py-2">{r.email}</td>
                    <td className="px-4 py-2">{r.state}</td>
                    <td className="px-4 py-2">{r.city}</td>
                    <td className="px-4 py-2">{r.timezone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {importMut.isSuccess && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
          Imported {importMut.data.imported} · skipped {importMut.data.skipped} (duplicates) · {importMut.data.errors.length} errors
          {importMut.data.errors.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-xs">
              {importMut.data.errors.slice(0, 5).map((e) => (
                <li key={e.row}>Row {e.row}: {e.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {importMut.isError && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">Import failed.</div>
      )}
    </div>
  );
}
