import { LogOut } from 'lucide-react';
import { portalApi } from '@/features/portal/api';
import { useAuth } from '@/features/auth/AuthContext';
import { ChangePasswordForm } from '@/features/auth/AuthScreens';
import { PushToggle } from '@/features/notifications/PushToggle';
import { useApi } from '@/shared/hooks/useApi';
import { ROLE_LABELS, formatCurrency, formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { PageHeader } from '@/shared/components/PageHeader';
import { InstallApp } from '@/shared/components/AppStatus';

export default function PortalProfile() {
  const { logout } = useAuth();
  const { data: home } = useApi(() => portalApi.home(), [], { cacheKey: 'me:home' });
  const staff = home?.staff;

  return (
    <div className="space-y-4">
      <PageHeader title="My profile" />
      {staff && (
        <Card>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Name', staff.name],
              ['Mobile', staff.phone],
              ['Role', ROLE_LABELS[staff.role] || staff.role],
              ['Joined', formatDate(staff.joinDate)],
              ['Daily wage', formatCurrency(staff.dailyWage)],
              ['Overtime', `${formatCurrency(staff.otRate)} / hour`],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-4"><PushToggle /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <CardContent><ChangePasswordForm /></CardContent>
      </Card>
      <InstallApp className="bg-card" />
      <Button variant="destructive-outline" className="w-full" onClick={logout}><LogOut /> Sign out</Button>
    </div>
  );
}
