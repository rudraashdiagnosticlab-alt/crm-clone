'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Handshake } from 'lucide-react';
import { NAV, type NavItem } from '@/lib/nav';
import { cn } from '@/lib/utils';

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-foreground/70 hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.code && (
        <span className="shrink-0 text-[10px] font-normal text-muted-foreground/70">{item.code}</span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r bg-card">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Handshake className="h-5 w-5" />
        </div>
        <span className="text-base font-semibold tracking-tight">Milta CRM</span>
      </div>

      {/* Grouped nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {NAV.map((group, gi) => (
          <div key={group.heading ?? gi}>
            {group.heading && (
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.heading}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
