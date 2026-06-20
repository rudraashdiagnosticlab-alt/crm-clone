'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Database, Phone, Bot, Link2, HardDrive, Server } from 'lucide-react';
import { configApi, type ConfigStatus } from '@/lib/crm';

function StatusRow({
  icon: Icon,
  name,
  detail,
  ok,
  okLabel = 'Configured',
  offLabel = 'Not configured',
}: {
  icon: typeof Database;
  name: string;
  detail?: string;
  ok: boolean;
  okLabel?: string;
  offLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium">{name}</p>
          {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
        </div>
      </div>
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
          ok ? 'text-green-600' : 'text-muted-foreground'
        }`}
      >
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        {ok ? okLabel : offLabel}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const { data, isLoading, isError } = useQuery<ConfigStatus>({
    queryKey: ['config-status'],
    queryFn: configApi.status,
    retry: false,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading integration status…</p>;
  if (isError || !data)
    return <p className="text-sm text-red-500">Could not load settings (admin role required).</p>;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Integration &amp; deployment status (read-only). Secrets are configured via environment variables
        (DEP-004) — values are never exposed here.
      </p>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <StatusRow icon={Database} name="Database" detail={data.database.provider} ok={data.database.configured} />
        <StatusRow icon={Server} name="Redis" detail="Cache / queues / Socket.IO" ok={data.redis.configured} />
        <StatusRow
          icon={Phone}
          name="Calling Provider"
          detail={data.calling.provider}
          ok={data.calling.configured}
        />
        <StatusRow
          icon={Bot}
          name="AI Provider"
          detail={`${data.ai.provider}${data.ai.model ? ` · ${data.ai.model}` : ''}`}
          ok={data.ai.configured}
        />
        <StatusRow
          icon={Link2}
          name="Quo Integration"
          detail={data.quo.sandbox ? 'Sandbox mode (simulated)' : 'Live'}
          ok={data.quo.configured}
          okLabel="Live"
          offLabel="Sandbox"
        />
        <StatusRow icon={HardDrive} name="Object Storage" detail="S3 (recordings/exports)" ok={data.storage.configured} />
      </div>

      <div className="rounded-md bg-amber-50 px-4 py-3 text-xs text-amber-700">
        To enable an integration, set its environment variables in <code>.env</code> and restart the API.
        See <code>.env.example</code> for the full list of keys.
      </div>
    </div>
  );
}
