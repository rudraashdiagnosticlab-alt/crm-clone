'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { navForRole, type NavItem, type Role } from '@/lib/nav';
import { cn } from '@/lib/utils';

function ShieldMark() {
  return (
    <div
      className="grid h-9 w-9 place-items-center rounded-[9px]"
      style={{
        background: 'linear-gradient(150deg,#6f8745,#333f25)',
        boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.14)',
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[21px] w-[21px]">
        <path d="M12 2L3 6v6c0 5 3.8 8.6 9 10 5.2-1.4 9-5 9-10V6l-9-4z" fill="#e7eed8" />
        <path
          d="M9.5 12l1.8 1.8 3.5-3.6"
          stroke="#42512f"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'relative mb-0.5 flex items-center gap-[11px] rounded-[9px] px-3 py-[9px] text-[13.5px] font-medium transition-colors',
        active ? 'bg-[#42512f] text-white shadow-sm' : 'text-[#c3d2a3] hover:bg-white/[.06] hover:text-white',
      )}
    >
      <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'opacity-100' : 'opacity-85')} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span
          className={cn(
            'ml-auto rounded-full px-[7px] py-px text-[10.5px] font-bold',
            active ? 'bg-white/90 text-[#11140d]' : 'bg-[#c98a18] text-[#11140d]',
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/auth/me')).data,
    retry: false,
  });

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  const name: string = me?.name ?? me?.email?.split('@')[0] ?? 'User';
  const initials = name
    .split(/[ .@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join('');
  const role = (me?.role ?? '').replace('_', ' ');
  const nav = navForRole(me?.role as Role | undefined);

  return (
    <aside
      className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col overflow-hidden text-[#e7eed8]"
      style={{ background: 'linear-gradient(177deg,#27301d,#1c2316)' }}
    >
      {/* Head — brand lockup */}
      <div className="border-b border-white/[.07] px-[18px] pb-[14px] pt-[18px]">
        <div className="flex items-center gap-[11px]">
          <ShieldMark />
          <div className="font-display text-[18px] font-semibold leading-none tracking-tight text-white">
            Milta
            <small className="mt-[2px] block text-[9.5px] font-medium uppercase tracking-[.22em] text-[#6f8745]">
              Sales CRM
            </small>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-5 pt-3">
        {nav.map((group) => (
          <div key={group.heading} className="mt-4 first:mt-0">
            <p className="px-3 pb-[7px] text-[10px] font-semibold uppercase tracking-[.16em] text-[#6f8745]">
              {group.heading}
            </p>
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </div>
        ))}
      </nav>

      {/* Foot — user */}
      <div className="border-t border-white/[.07] p-3">
        <Link
          href="/settings"
          className="flex items-center gap-[10px] rounded-[10px] p-2 transition-colors hover:bg-white/[.06]"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#556b34] font-display text-[13px] font-semibold text-white">
            {initials || 'U'}
          </div>
          <div className="overflow-hidden leading-tight">
            <div className="truncate text-[13px] font-semibold text-white">{name}</div>
            <div className="text-[11px] capitalize text-[#94ab68]">{role || 'Member'}</div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
