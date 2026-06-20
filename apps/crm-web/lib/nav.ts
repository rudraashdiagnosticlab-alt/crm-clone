import {
  Home,
  Table,
  BarChart3,
  Users,
  Upload,
  Shuffle,
  Target,
  Phone,
  ClipboardList,
  Activity,
  Gauge,
  Bell,
  Bot,
  Headphones,
  Sparkles,
  Shield,
  Lock,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Spec module code shown as a hint, e.g. "M3". */
  code?: string;
}

export interface NavGroup {
  heading?: string;
  items: NavItem[];
}

// Single source of truth for the left sidebar + page titles.
// Mirrors the modules in CRM_Lead_Sales_System_Requirements.xlsx.
export const NAV: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: Home, code: 'M3' },
      { label: 'Pivot Reports', href: '/reports', icon: Table, code: 'M9' },
      { label: 'Charts & Maps', href: '/analytics', icon: BarChart3, code: 'M6-M8' },
    ],
  },
  {
    heading: 'Leads',
    items: [
      { label: 'Leads', href: '/leads', icon: Users, code: 'M10' },
      { label: 'Import Leads', href: '/import', icon: Upload, code: 'M2' },
      { label: 'Assignments', href: '/assignments', icon: Shuffle, code: 'RES' },
      { label: 'Targets', href: '/targets', icon: Target, code: 'M5' },
    ],
  },
  {
    heading: 'Calling',
    items: [
      { label: 'Caller Workspace', href: '/calling', icon: Phone, code: 'CAL' },
      { label: 'Daily Summary', href: '/call-summary', icon: ClipboardList, code: 'CAL-23' },
    ],
  },
  {
    heading: 'Team',
    items: [
      { label: 'Team Productivity', href: '/productivity', icon: Activity, code: 'M11' },
      { label: 'Manager Dashboard', href: '/manager', icon: Gauge, code: 'MGR' },
      { label: 'Notifications', href: '/notifications', icon: Bell, code: 'M12' },
    ],
  },
  {
    heading: 'AI',
    items: [
      { label: 'AI Training', href: '/ai-training', icon: Bot, code: 'AIT' },
      { label: 'Voice Coaching', href: '/ai-coaching', icon: Headphones, code: 'AVC' },
      { label: 'AI Insights', href: '/ai-insights', icon: Sparkles, code: 'AI' },
    ],
  },
  {
    heading: 'Admin',
    items: [
      { label: 'Users & Roles', href: '/users', icon: Shield, code: 'M1' },
      { label: 'Security & Logs', href: '/security', icon: Lock, code: 'SEC' },
      { label: 'Settings', href: '/settings', icon: Settings, code: 'DEP' },
    ],
  },
];

const FLAT = NAV.flatMap((g) => g.items);

/** Resolve the page title for a pathname by longest matching href. */
export function titleForPath(pathname: string): string {
  let best: NavItem | undefined;
  for (const item of FLAT) {
    if (pathname === item.href || pathname.startsWith(item.href + '/')) {
      if (!best || item.href.length > best.href.length) best = item;
    }
  }
  return best?.label ?? 'CRM';
}
