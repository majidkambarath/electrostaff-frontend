import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  Receipt,
  Building2,
  CalendarOff,
  ClipboardCheck,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  Menu,
  Settings,
  Star,
  Users,
  MessageSquare,
  Zap,
  UserSearch,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { formatDateLong } from '@/shared/lib/format';
import { useAuth, useOrg } from '@/features/auth/AuthContext';
import { buttonVariants } from '@/shared/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/shared/ui/sheet';
import { PageLoader } from '@/shared/components/PageLoader';
import { MotionPage } from '@/shared/components/Motion';
import { PlanBanner } from '@/shared/components/PlanBanner';
import { InstallApp, OfflineBanner } from '@/shared/components/AppStatus';
import { UserMenu } from '@/features/auth/UserMenu';
import { NotificationBell } from '@/features/notifications/NotificationBell';

const NAV_GROUPS = [
  { label: null, items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  {
    label: 'Operations',
    items: [
      { to: '/sites', label: 'Sites', icon: Building2 },
      { to: '/staff', label: 'Staff', icon: Users },
      { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
      { to: '/leaves', label: 'Leaves', icon: CalendarOff },
      { to: '/requests', label: 'Staff requests', icon: MessageSquare },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/payments', label: 'Payments & payroll', icon: CreditCard, match: ['/payments', '/payroll'] },
      { to: '/advances', label: 'Advances', icon: HandCoins },
      { to: '/expenses', label: 'Expenses', icon: Receipt },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/reports', label: 'Reports', icon: BarChart3, end: true },
      { to: '/reports/staff', label: 'Staff report', icon: UserSearch },
      { to: '/reports/muster', label: 'Muster roll', icon: ClipboardList },
      { to: '/performance', label: 'Performance', icon: Star },
    ],
  },
];

// Site supervisors only mark attendance for their sites.
const SUPERVISOR_NAV = [
  {
    label: null,
    items: [
      { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
      { to: '/account', label: 'My account', icon: Settings },
    ],
  },
];
const SUPERVISOR_TABS = SUPERVISOR_NAV[0].items;

const MOBILE_TABS = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/sites', label: 'Sites', icon: Building2 },
  { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
  { to: '/payments', label: 'Payments', icon: CreditCard },
];

function Brand({ name }) {
  return (
    <Link to="/" className="flex min-h-10 min-w-0 items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Zap className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight">ElectroStaff</span>
        <span className="block truncate text-xs text-muted-foreground">{name}</span>
      </span>
    </Link>
  );
}

function NavItems({ onNavigate }) {
  const { pathname } = useLocation();
  const { principal } = useAuth();
  const groups = principal?.role === 'supervisor' ? SUPERVISOR_NAV : NAV_GROUPS;
  return (
    <nav className="flex flex-col gap-4 p-3" aria-label="Main">
      {groups.map((group, i) => (
        <div key={group.label || i} className="flex flex-col gap-0.5">
          {group.label && (
            <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
          )}
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex h-9 items-center gap-2.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  (isActive || item.match?.some((p) => pathname.startsWith(p))) &&
                    'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function SettingsLink({ onNavigate }) {
  return (
    <div className="border-t border-border p-3">
      <NavLink
        to="/settings"
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'flex h-9 items-center gap-2.5 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
            isActive && 'bg-primary/10 text-primary'
          )
        }
      >
        <Settings className="h-4 w-4" />
        Settings
      </NavLink>
    </div>
  );
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { org } = useOrg();
  const { principal } = useAuth();
  const location = useLocation();
  const close = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card lg:flex print:hidden">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Brand name={org?.name} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavItems />
        </div>
        <SettingsLink />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="flex flex-col gap-0 p-0 sm:p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-14 items-center border-b border-border px-4">
            <Brand name={org?.name} />
          </div>
          <div className="flex-1 overflow-y-auto">
            <NavItems onNavigate={close} />
          </div>
          <InstallApp compact className="mx-3 mb-2" />
          <SettingsLink onNavigate={close} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-60 print:pl-0">
        <header className="sticky top-0 z-30 flex h-14 [@media(max-height:500px)]:static items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur lg:px-6 print:hidden">
          <button
            type="button"
            className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'lg:hidden')}
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </button>
          <div className="min-w-0 lg:hidden">
            <Brand name={org?.name} />
          </div>
          <p className="hidden text-sm text-muted-foreground lg:block">{formatDateLong(new Date())}</p>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/attendance"
              className={cn(
                buttonVariants({ size: 'sm' }),
                'hidden sm:inline-flex',
                ['/', '/attendance'].includes(location.pathname) && 'sm:hidden'
              )}
            >
              <ClipboardCheck /> Mark attendance
            </Link>
            <NotificationBell />
            <UserMenu settingsPath={principal?.role === 'supervisor' ? '/account' : '/settings'} />
          </div>
        </header>
        <OfflineBanner />
        <PlanBanner plan={org?.plan} />

        <main className="mx-auto w-full max-w-[1400px] p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:p-6 lg:pb-8 print:p-0">
          <Suspense fallback={<PageLoader />}>
            <MotionPage key={location.pathname}>
              <Outlet />
            </MotionPage>
          </Suspense>
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Quick"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden"
      >
        {(principal?.role === 'supervisor' ? SUPERVISOR_TABS : MOBILE_TABS).map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'flex h-14 flex-col [@media(max-height:500px)]:h-11 items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground',
                isActive && 'text-primary'
              )
            }
          >
            <tab.icon className="h-5 w-5" />
            <span className="[@media(max-height:500px)]:sr-only">{tab.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-14 flex-col [@media(max-height:500px)]:h-11 items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground"
        >
          <Menu className="h-5 w-5" />
          <span className="[@media(max-height:500px)]:sr-only">More</span>
        </button>
      </nav>
    </div>
  );
}
