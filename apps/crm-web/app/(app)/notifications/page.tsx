'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { notificationsApi } from '@/lib/crm';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
  });

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unread} unread · {items.length} total (NTF)
        </p>
        {unread > 0 && (
          <button
            onClick={() => markAll.mutate()}
            className="rounded-md border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && items.length === 0 && (
          <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
            No notifications yet. Import leads or complete calls to generate alerts.
          </div>
        )}
        {items.map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm ${
              n.isRead ? 'opacity-70' : ''
            }`}
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bell className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{n.title}</p>
                {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </div>
              <p className="text-sm text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
