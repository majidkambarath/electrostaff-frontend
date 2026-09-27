import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Printer, Wallet } from 'lucide-react';
import { portalApi } from '@/features/portal/api';
import { useApi } from '@/shared/hooks/useApi';
import { PAYMENT_MODE_LABELS, formatCurrency, formatDate, formatRange, paymentNet, slipNumber } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { PageHeader } from '@/shared/components/PageHeader';
import { PageLoader } from '@/shared/components/PageLoader';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { EmptyState, ErrorState } from '@/shared/components/States';
import { PaymentProof, WageSlipDocument } from '@/features/payments/components/WageSlipDocument';

export function PortalPayslips() {
  const { data, error, loading, reload } = useApi(() => portalApi.payslips(), [], { cacheKey: 'me:payslips' });
  if (loading) return <PageLoader title="My payslips" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <PageHeader title="My payslips" description="Every wage payment with its slip" />
      {data.length === 0 ? (
        <EmptyState icon={Wallet} title="No payments yet" description="Your payslips appear here after the office pays your wages." />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {data.map((p) => (
            <Link key={p._id} to={`/me/payslips/${p._id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{formatRange(p.periodStart, p.periodEnd)}</p>
                <p className="text-xs text-muted-foreground">
                  {p.totalDays} days
                  {p.paidDate && ` · ${PAYMENT_MODE_LABELS[p.paymentMode] || ''} ${formatDate(p.paidDate)}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatCurrency(paymentNet(p))}</p>
                <StatusBadge status={p.status} />
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}

export function PortalPayslip() {
  const { id } = useParams();
  const { data: p, error, loading, reload } = useApi(() => portalApi.payslip(id), [id], { cacheKey: `me:payslip:${id}` });
  const loadProof = useCallback(() => portalApi.payslipProofUrl(id), [id]);

  if (loading) return <PageLoader />;
  if (error && !p) {
    return (
      <div className="space-y-4">
        <PageHeader title="Payslip" backTo="/me/payslips" />
        <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <PageHeader
        className="print:hidden"
        backTo="/me/payslips"
        title={`Payslip ${slipNumber(p)}`}
        meta={<StatusBadge status={p.status} />}
        actions={<Button size="sm" variant="outline" onClick={() => window.print()}><Printer /> Print / PDF</Button>}
      />
      <WageSlipDocument payment={p} />
      {p.proofId && <PaymentProof load={loadProof} />}
    </div>
  );
}
