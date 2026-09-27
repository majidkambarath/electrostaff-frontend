import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MessageCircle, Printer } from 'lucide-react';
import { paymentsApi } from '@/features/payments/api';
import { useApi } from '@/shared/hooks/useApi';
import { formatDate, slipNumber } from '@/shared/lib/format';
import { shareSlipOnWhatsApp } from '@/shared/lib/share';
import { Button, buttonVariants } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/PageHeader';
import { PageLoader } from '@/shared/components/PageLoader';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { ErrorState } from '@/shared/components/States';
import { ProfileHint } from '@/shared/components/print/Document';
import { PaymentProof, WageSlipDocument } from '@/features/payments/components/WageSlipDocument';

export default function PaymentSlip() {
  const { id } = useParams();
  const { data: p, error, loading, reload } = useApi(() => paymentsApi.get(id), [id], { cacheKey: `payment:${id}` });
  const loadProof = useCallback(() => paymentsApi.proofUrl(id), [id]);

  if (loading) return <PageLoader />;
  if (error && !p) {
    return (
      <div className="space-y-4">
        <PageHeader title="Wage slip" backTo="/payments?tab=history" />
        <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} />
      </div>
    );
  }

  const staff = p.staffId || {};
  return (
    <div className="space-y-4">
      <PageHeader
        className="print:hidden"
        backTo="/payments?tab=history"
        title={`Wage slip ${slipNumber(p)}`}
        meta={<StatusBadge status={p.status} />}
        description={`${staff.name} · ${formatDate(p.periodStart)} – ${formatDate(p.periodEnd)}`}
        actions={
          <>
            <Link to={`/staff/${staff._id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Staff profile</Link>
            <Button variant="outline" size="sm" onClick={() => shareSlipOnWhatsApp(p, p.organization)}>
              <MessageCircle /> WhatsApp
            </Button>
            <Button size="sm" onClick={() => window.print()}><Printer /> Print / PDF</Button>
          </>
        }
      />
      {p.status !== 'paid' && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 print:hidden">
          This payment is still pending. Mark it paid from{' '}
          <Link to="/payments?tab=history&status=pending" className="font-medium underline">Payments → History</Link>.
        </p>
      )}
      <ProfileHint org={p.organization} />
      <WageSlipDocument payment={p} />
      {p.proofId && <PaymentProof load={loadProof} />}
    </div>
  );
}
