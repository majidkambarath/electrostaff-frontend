import { AlertTriangle, Clock } from 'lucide-react';
import { formatDate } from '@/shared/lib/format';

// Trial countdown (last 7 days) and the read-only notice when a plan has ended.
// `plan` is organization.plan from /auth/me.
export function PlanBanner({ plan }) {
  if (!plan?.name) return null;
  if (plan.expired) {
    return (
      <div role="alert" className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 print:hidden">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Your {plan.label} plan ended on {formatDate(plan.validUntil)}. You can still view everything, but changes are
          blocked until it is renewed. Contact ElectroStaff to renew.
        </span>
      </div>
    );
  }
  if (plan.daysLeft === null || plan.daysLeft > 7) return null;
  return (
    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 print:hidden">
      <Clock className="h-4 w-4 shrink-0" />
      <span>
        {plan.label}: {plan.daysLeft <= 1 ? 'ends today' : `${plan.daysLeft} days left`} (until {formatDate(plan.validUntil)}).
        {plan.staffLimit ? ` Up to ${plan.staffLimit} active staff.` : ''}
      </span>
    </div>
  );
}
