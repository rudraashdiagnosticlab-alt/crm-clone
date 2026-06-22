import {
  LayoutGrid,
  Activity,
  Headphones,
  Target,
  Contact,
  GitBranch,
  Clock,
  PhoneCall,
  ListOrdered,
  PhoneForwarded,
  NotebookPen,
  SquareKanban,
  Calendar,
  BarChart3,
  Map,
  Bot,
  Plug,
  Shield,
  SlidersHorizontal,
  Settings,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  sub?: string;
  badge?: string;
}

export interface NavGroup {
  heading: string;
  items: NavItem[];
}

// Exact Ranger CRM menu — groups, labels, order, badges.
export const NAV: NavGroup[] = [
  {
    heading: 'Operations',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid, sub: 'Operations overview' },
      { label: 'Performance', href: '/productivity', icon: Activity, sub: 'Team productivity' },
      { label: 'Live Team', href: '/manager', icon: Headphones, sub: 'Real-time floor status', badge: '3' },
    ],
  },
  {
    heading: 'Pipeline',
    items: [
      { label: 'Lead Management', href: '/leads', icon: Target, sub: 'Master lead database' },
      { label: 'Contacts', href: '/contacts', icon: Contact, sub: 'People & companies' },
      { label: 'Sales Pipeline', href: '/pipeline', icon: GitBranch, sub: 'Deals by stage' },
      { label: 'Follow-Ups', href: '/followups', icon: Clock, sub: 'Callbacks & reminders', badge: '5' },
    ],
  },
  {
    heading: 'Calling',
    items: [
      { label: 'Calling Panel', href: '/calling', icon: PhoneCall, sub: 'Dialer workspace' },
      { label: 'Call Queue', href: '/queue', icon: ListOrdered, sub: "Today's assignments" },
      { label: 'Assigned Calls', href: '/assigned', icon: PhoneForwarded, sub: 'Team assignments' },
      { label: 'Activity Tracker', href: '/activity', icon: NotebookPen, sub: 'Call activity log' },
      { label: 'Communications', href: '/communications', icon: MessageSquare, sub: 'Calls & SMS analytics' },
    ],
  },
  {
    heading: 'Workspace',
    items: [
      { label: 'Tasks', href: '/tasks', icon: SquareKanban, sub: 'Personal task board' },
      { label: 'Calendar', href: '/calendar', icon: Calendar, sub: 'Calls & meetings' },
      { label: 'Reports & Analytics', href: '/reports', icon: BarChart3, sub: 'Pivot & charts' },
      { label: 'Territory Map', href: '/territories', icon: Map, sub: 'State coverage' },
    ],
  },
  {
    heading: 'AI & Admin',
    items: [
      { label: 'AI Training', href: '/ai-training', icon: Bot, sub: 'Knowledge base & coaching' },
      { label: 'Integrations', href: '/integrations', icon: Plug, sub: 'Calling platforms' },
      { label: 'User Management', href: '/users', icon: Shield, sub: 'Users & roles' },
      { label: 'Admin Panel', href: '/admin', icon: SlidersHorizontal, sub: 'System administration' },
      { label: 'Settings', href: '/settings', icon: Settings, sub: 'Profile & preferences' },
    ],
  },
];

const FLAT = NAV.flatMap((g) => g.items);

function match(pathname: string): NavItem | undefined {
  let best: NavItem | undefined;
  for (const item of FLAT) {
    if (pathname === item.href || pathname.startsWith(item.href + '/')) {
      if (!best || item.href.length > best.href.length) best = item;
    }
  }
  return best;
}

export function titleForPath(pathname: string): string {
  return match(pathname)?.label ?? 'Ranger CRM';
}

export function subForPath(pathname: string): string {
  return match(pathname)?.sub ?? '';
}
