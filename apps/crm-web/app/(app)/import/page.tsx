'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, Check } from 'lucide-react';
import { importApi, type LeadRow } from '@/lib/crm';
import { PageHead } from '@/components/page-head';

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
  const idx = (f: keyof LeadRow) => headers.findIndex((h) => FIELD_ALIASES[f].includes(h));
  const c = { businessName: idx('businessName'), phone: idx('phone'), email: idx('email'), state: idx('state'), city: idx('city'), timezone: idx('timezone') };
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((x) => x.trim());
    return {
      businessName: c.businessName >= 0 ? cells[c.businessName] : '',
      phone: c.phone >= 0 ? cells[c.phone] : '',
      email: c.email >= 0 ? cells[c.email] : undefined,
      state: c.state >= 0 ? cells[c.state] : '',
      city: c.city >= 0 ? cells[c.city] : '',
      timezone: c.timezone >= 0 ? cells[c.timezone] : undefined,
    };
  });
}

const SAMPLE = `Business Name,Phone,Email,State,City,Timezone
Acme Tax LLC,+13055551234,info@acme.com,Florida,Miami,EST
Bay Books Inc,+14155559876,hi@baybooks.com,California,San Francisco,PST`;

export default function ImportPage() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [raw, setRaw] = useState('');
  const importMut = useMutation({ mutationFn: () => importApi.bulk(rows) });

  function load(text: string) { setRaw(text); setRows(parseCsv(text)); importMut.reset(); }

  return (
    <div>
      <PageHead lead="Upload Excel/CSV (Business Name, Phone, Email, State, City, Timezone). Preview, then import with dedupe." />

      <div className="grid gap-[18px] lg:grid-cols-2">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#ccd3ba] bg-background p-[34px] text-center transition-colors hover:border-[#94ab68]">
          <div className="mb-3 grid h-[52px] w-[52px] place-items-center rounded-[14px] bg-[#e7eed8] text-[#42512f]"><Upload className="h-6 w-6" /></div>
          <div className="font-semibold">Drop your file here or <span className="text-primary">browse</span></div>
          <div className="mt-1 text-[12.5px] text-muted-foreground">CSV, XLSX up to 25MB</div>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) f.text().then(load); }} />
        </label>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold">Or paste CSV</span>
            <button onClick={() => load(SAMPLE)} className="text-[12px] font-semibold text-primary">Load sample</button>
          </div>
          <textarea value={raw} onChange={(e) => load(e.target.value)} rows={6} placeholder="Business Name,Phone,Email,State,City,Timezone…" className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs" />
        </div>
      </div>

      {rows.length > 0 && (
        <div className="mt-[18px] overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-[18px] py-4">
            <div><h3 className="font-display text-[15px] font-semibold">Preview</h3><div className="text-xs text-muted-foreground">{rows.length} rows · first 10 shown</div></div>
            <button onClick={() => importMut.mutate()} disabled={importMut.isPending} className="inline-flex items-center gap-2 rounded-md bg-primary px-[15px] py-[9px] text-[13px] font-semibold text-primary-foreground disabled:opacity-60">
              <Check className="h-4 w-4" /> {importMut.isPending ? 'Importing…' : `Import ${rows.length}`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="border-b bg-background text-left text-[11px] uppercase tracking-[.06em] text-muted-foreground">{['Business', 'Phone', 'Email', 'State', 'City', 'TZ'].map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {rows.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-b last:border-0"><td className="px-4 py-2">{r.businessName}</td><td className="px-4 py-2 font-mono text-[12px]">{r.phone}</td><td className="px-4 py-2">{r.email}</td><td className="px-4 py-2">{r.state}</td><td className="px-4 py-2">{r.city}</td><td className="px-4 py-2">{r.timezone}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {importMut.isSuccess && (
        <div className="mt-4 rounded-md bg-[#e8f2e4] px-4 py-3 text-sm text-[#3f7a32]">
          Imported {importMut.data.imported} · skipped {importMut.data.skipped} (duplicates) · {importMut.data.errors.length} errors
          {importMut.data.errors.length > 0 && <ul className="mt-1 list-inside list-disc text-xs">{importMut.data.errors.slice(0, 5).map((e) => <li key={e.row}>Row {e.row}: {e.reason}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}
