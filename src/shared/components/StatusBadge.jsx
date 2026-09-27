import { Badge, statusBadgeVariant } from '@/shared/ui/badge';

const STATUS_LABELS = {
  present: 'Present',
  absent: 'Absent',
  half: 'Half day',
  leave: 'Leave',
  active: 'Active',
  inactive: 'Inactive',
  'on-leave': 'On leave',
  completed: 'Completed',
  onhold: 'On hold',
  pending: 'Pending',
  paid: 'Paid',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export function StatusBadge({ status, className }) {
  return (
    <Badge variant={statusBadgeVariant(status)} className={className}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}
