import { useAuth } from '@/features/auth/AuthContext';
import { ChangePasswordForm } from '@/features/auth/AuthScreens';
import { PushToggle } from '@/features/notifications/PushToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { PageHeader } from '@/shared/components/PageHeader';
import { InstallApp } from '@/shared/components/AppStatus';

// Personal settings for office people who don't manage the business (site supervisors).
export default function Account() {
  const { principal } = useAuth();
  return (
    <div className="space-y-4">
      <PageHeader title="My account" description={`${principal.name} · ${principal.phone}`} />
      <Card className="max-w-2xl">
        <CardContent className="p-4"><PushToggle /></CardContent>
      </Card>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Your password</CardTitle>
          <CardDescription>Changing it signs you out on your other devices.</CardDescription>
        </CardHeader>
        <CardContent><ChangePasswordForm /></CardContent>
      </Card>
      <InstallApp className="max-w-2xl bg-card" />
    </div>
  );
}
