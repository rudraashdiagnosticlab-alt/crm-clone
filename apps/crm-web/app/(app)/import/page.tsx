'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import { importApi, type LeadRow } from '@/lib/crm';
import { PageHead } from '@/components/page-head';

/**
 * Canonical lead column order (matches the upload sheet). Drives parsing,
 * the preview header, and the sample. `aliases` are matched case-insensitively
 * against the file header so minor naming differences still map.
 */
const COLUMNS: { key: keyof LeadRow; label: string; aliases: string[] }[] = [
  { key: 'phone', label: 'PHONE', aliases: ['phone', 'phone number', 'mobile'] },
  { key: 'businessName', label: 'COMPANY NAME', aliases: ['company name', 'company', 'business name', 'businessname', 'business'] },
  { key: 'contactName', label: 'NAME', aliases: ['name', 'contact', 'contact name'] },
  { key: 'timezone', label: 'TIME ZONE', aliases: ['time zone', 'timezone', 'tz'] },
  { key: 'email', label: 'EMAIL', aliases: ['email', 'e-mail'] },
  { key: 'industry', label: 'INDUSTRY', aliases: ['industry'] },
  { key: 'title', label: 'TITLE', aliases: ['title', 'job title'] },
  { key: 'state', label: 'STATE', aliases: ['state'] },
  { key: 'city', label: 'CITY', aliases: ['city'] },
  { key: 'vlc', label: 'VLC', aliases: ['vlc'] },
  { key: 'employeeCode', label: 'Employee Code', aliases: ['employee code', 'emp code', 'employeecode'] },
  { key: 'caller', label: 'CALLER', aliases: ['caller', 'assigned to', 'agent'] },
  { key: 'status', label: 'STATUS', aliases: ['status'] },
  { key: 'comments', label: 'COMMENTS', aliases: ['comments', 'comment', 'remarks', 'notes'] },
  { key: 'nextFollowUpDate', label: 'NEXT FOLLOW UP DATE', aliases: ['next follow up date', 'next followup date', 'next follow-up date', 'follow up date', 'followup date'] },
  { key: 'leadCategory', label: 'LEAD CATEGORY', aliases: ['lead category', 'category'] },
];

const STATUS_MAP: Record<string, string> = {
  new: 'new',
  'in progress': 'in_progress',
  in_progress: 'in_progress',
  contacted: 'contacted',
  interested: 'interested',
  closed: 'closed',
  'closed won': 'closed',
  rejected: 'rejected',
};
const TIMEZONES = ['EST', 'CST', 'MST', 'PST'];

/** Split one CSV line, respecting double-quoted fields (so commas inside
 * COMMENTS don't break the row). Doubled quotes ("") become a literal quote. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function normalize(key: keyof LeadRow, raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  if (key === 'timezone') { const u = v.toUpperCase(); return TIMEZONES.includes(u) ? u : undefined; }
  if (key === 'status') return STATUS_MAP[v.toLowerCase()] ?? undefined;
  return v;
}

// Header matching is by NAME, not position — columns can be in any order.
// Normalize away case, spaces, and separators so "COMPANY NAME", "company_name",
// "Company-Name" and "companyname" all map to the same column.
const normHeader = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function parseCsv(text: string): LeadRow[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map(normHeader);
  const colIdx = COLUMNS.map((col) => {
    const aliases = col.aliases.map(normHeader);
    return headers.findIndex((h) => h !== '' && aliases.includes(h));
  });

  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string | undefined> = {};
    COLUMNS.forEach((col, ci) => {
      const i = colIdx[ci];
      row[col.key] = i >= 0 ? normalize(col.key, cells[i] ?? '') : undefined;
    });
    return {
      businessName: row.businessName ?? '',
      phone: row.phone ?? '',
      email: row.email,
      state: row.state ?? '',
      city: row.city ?? '',
      timezone: row.timezone,
      status: row.status,
      contactName: row.contactName,
      industry: row.industry,
      title: row.title,
      vlc: row.vlc,
      employeeCode: row.employeeCode,
      comments: row.comments,
      leadCategory: row.leadCategory,
      nextFollowUpDate: row.nextFollowUpDate,
      caller: row.caller,
    };
  });
}

const SAMPLE = `${COLUMNS.map((c) => c.label).join(',')}
+13055551234,Acme Tax LLC,John Carter,EST,john@acme.com,Accounting,Owner,Florida,Miami,VLC-1,EMP-101,caller1@crm.local,New,"Interested, call back",2026-07-01,Hot
+14155559876,Bay Books Inc,Mia Wong,PST,mia@baybooks.com,Bookkeeping,CFO,California,San Francisco,VLC-2,EMP-102,caller2@crm.local,Contacted,Left voicemail,2026-07-03,Warm`;

export default function ImportPage() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [raw, setRaw] = useState('');
  const importMut = useMutation({ mutationFn: () => importApi.bulk(rows) });

  function load(text: string) { setRaw(text); setRows(parseCsv(text)); importMut.reset(); }

  // Accept CSV or Excel (.xlsx/.xls) — Excel sheets are converted to CSV and
  // run through the same quote-aware parser + column-alias mapping.
  function loadFile(file: File) {
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    if (!isExcel) { file.text().then(load); return; }
    file.arrayBuffer().then((buf) => {
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      load(XLSX.utils.sheet_to_csv(sheet));
    });
  }

  return (
    <div>
      <PageHead lead="Upload Excel/CSV using the standard lead columns. Preview, then import with dedupe." />

      <div className="grid gap-[18px] lg:grid-cols-2">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#ccd3ba] bg-background p-[34px] text-center transition-colors hover:border-[#94ab68]">
          <div className="mb-3 grid h-[52px] w-[52px] place-items-center rounded-[14px] bg-[#e7eed8] text-[#42512f]"><Upload className="h-6 w-6" /></div>
          <div className="font-semibold">Drop your file here or <span className="text-primary">browse</span></div>
          <div className="mt-1 text-[12.5px] text-muted-foreground">CSV or Excel (.xlsx/.xls) up to 25MB</div>
          <input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
        </label>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold">Or paste CSV</span>
            <button onClick={() => load(SAMPLE)} className="text-[12px] font-semibold text-primary">Load sample</button>
          </div>
          <textarea value={raw} onChange={(e) => load(e.target.value)} rows={6} placeholder="Paste rows with the standard lead columns…" className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs" />
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Columns: {COLUMNS.map((c) => c.label).join(' · ')}
          </p>
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
            <table className="w-full whitespace-nowrap text-[13px]">
              <thead><tr className="border-b bg-background text-left text-[11px] uppercase tracking-[.06em] text-muted-foreground">{COLUMNS.map((c) => <th key={c.key} className="px-4 py-2.5 font-semibold">{c.label}</th>)}</tr></thead>
              <tbody>
                {rows.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {COLUMNS.map((c) => <td key={c.key} className="px-4 py-2 text-muted-foreground">{(r as unknown as Record<string, string | undefined>)[c.key] ?? '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {importMut.isSuccess && (
        <div className="mt-4 rounded-md bg-[#e8f2e4] px-4 py-3 text-sm text-[#3f7a32]">
          Created {importMut.data.imported} · updated {importMut.data.updated} (existing) · {importMut.data.errors.length} errors
          {importMut.data.errors.length > 0 && <ul className="mt-1 list-inside list-disc text-xs">{importMut.data.errors.slice(0, 5).map((e) => <li key={e.row}>Row {e.row}: {e.reason}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}
