'use client';

import { useRouter } from 'next/navigation';
import { Search, Plus, Settings, LayoutGrid, LogOut } from 'lucide-react';
import { useState } from 'react';
import { tokenStore } from '@/lib/api';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from '@/components/notification-bell';

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

export function Topbar({ title, email }: { title: string; email?: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const initial = (email ?? 'U').charAt(0).toUpperCase();

  function logout() {
    tokenStore.clear();
    router.replace('/login');
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-card px-6">
      <h1 className="text-lg font-semibold">{title}</h1>

      <div className="flex flex-1 items-center justify-end gap-1">
        {/* Search records */}
        <div className="relative mr-1 hidden w-72 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search records"
            className="w-full rounded-full border bg-background py-1.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <IconButton label="Create">
          <Plus className="h-5 w-5" />
        </IconButton>
        <NotificationBell />
        <IconButton label="Settings">
          <Settings className="h-5 w-5" />
        </IconButton>
        <IconButton label="Apps">
          <LayoutGrid className="h-5 w-5" />
        </IconButton>
        <ThemeToggle />

        {/* Profile */}
        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          >
            {initial}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border bg-card p-1 shadow-lg">
                <div className="border-b px-3 py-2 text-sm text-muted-foreground">{email}</div>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
