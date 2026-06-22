'use client';

/** Ranger page-head: a lead/description line on the left, actions on the right. */
export function PageHead({ lead, children }: { lead: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-[60ch] text-[13px] text-muted-foreground">{lead}</div>
      {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
    </div>
  );
}

/** Small avatar with initials, Ranger style. */
export function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = (name || '?')
    .split(/[ .@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
  const dim = size === 'lg' ? 'h-11 w-11 text-[15px]' : size === 'md' ? 'h-9 w-9 text-[13px]' : 'h-[30px] w-[30px] text-[12px]';
  return (
    <div className={`grid ${dim} shrink-0 place-items-center rounded-full bg-[#556b34] font-display font-semibold text-white`}>
      {initials}
    </div>
  );
}
