import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CalendarDays, CalendarOff, Home, MessageSquare, Wallet, Zap } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useAuth } from '@/features/auth/AuthContext';
import { UserMenu } from '@/features/auth/UserMenu';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { OfflineBanner } from '@/shared/components/AppStatus';
import { PageLoader } from '@/shared/components/PageLoader';
import { MotionPage } from '@/shared/components/Motion';

const TABS = [
  { to: '/me', label: 'Home', icon: Home, end: true },
  { to: '/me/attendance', label: 'Attendance', icon: CalendarDays },
  { to: '/me/payslips', label: 'Payslips', icon: Wallet },
  { to: '/me/leaves', label: 'Leave', icon: CalendarOff },
  { to: '/me/requests', label: 'Requests', icon: MessageSquare },
];

// Staff app shell: phone-first, one column, bottom tabs on every screen size.
export default function PortalLayout() {
  const { org } = useAuth();
  const location = useLocation();
  const business = org?.name && org.name !== 'Default Organization' ? org.name : 'ElectroStaff';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur print:hidden [@media(max-height:500px)]:static">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{business}</p>
            <p className="text-xs text-muted-foreground">Staff app</p>
          </div>
          <NotificationBell />
          <UserMenu settingsPath="/me/profile" />
        </div>
      </header>
      <OfflineBanner />

      <main className="mx-auto w-full max-w-2xl p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] print:max-w-none print:p-0">
        <Suspense fallback={<PageLoader />}>
          <MotionPage key={location.pathname}>
              <Outlet />
            </MotionPage>
        </Suspense>
      </main>

      <nav
        aria-label="Staff app"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] print:hidden"
      >
        <div className="mx-auto grid max-w-2xl grid-cols-5">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground [@media(max-height:500px)]:h-11',
                  isActive && 'text-primary'
                )
              }
            >
              <tab.icon className="h-5 w-5" />
              <span className="[@media(max-height:500px)]:sr-only">{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
