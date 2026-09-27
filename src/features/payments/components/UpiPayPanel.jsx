import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { buildUpiLink, canOpenUpiApps } from '@/shared/lib/upi';
import { compressImage } from '@/shared/lib/image';
import { formatCurrency } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { buttonVariants } from '@/shared/ui/button';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Field } from '@/shared/components/Field';

function UpiQr({ link }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let cancelled = false;
    import('qrcode')
      .then((QR) => QR.toDataURL(link, { margin: 1, width: 220 }))
      .then((url) => !cancelled && setSrc(url))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [link]);
  return src ? <img src={src} alt="UPI payment QR code" className="h-44 w-44 rounded-md border border-border bg-white p-1" /> : <div className="h-44 w-44 animate-pulse rounded-md bg-muted" />;
}

// Pay a worker by UPI and attach proof. Browsers get no success signal back from UPI apps,
// so after paying the office confirms with the UTR and/or a screenshot.
export function UpiPayPanel({ staff, amount, note, transactionRef, onTransactionRef, proof, onProof }) {
  const fileRef = useRef(null);
  const [reading, setReading] = useState(false);
  const link = staff?.upiId ? buildUpiLink({ upiId: staff.upiId, name: staff.name, amount, note }) : null;
  const phone = canOpenUpiApps();

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setReading(true);
    try {
      onProof(await compressImage(file));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-blue-200 bg-blue-50/50 p-3">
      {link ? (
        phone ? (
          <a href={link} className={cn(buttonVariants(), 'w-full')}>
            <ExternalLink /> Pay {formatCurrency(amount)} in UPI app
          </a>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
            <UpiQr link={link} />
            <p className="text-sm text-muted-foreground">
              Scan with Google Pay / PhonePe on your phone to pay <b className="text-foreground">{formatCurrency(amount)}</b> to {staff.upiId}.
            </p>
          </div>
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          No UPI ID saved for {staff?.name || 'this person'}.{' '}
          {staff?._id && <Link to={`/staff/${staff._id}`} className="font-medium text-primary underline">Add it in their profile</Link>}{' '}
          to open UPI apps with the amount filled in.
        </p>
      )}

      <Field label="UPI transaction ID (UTR)" htmlFor="upi-ref" hint="Optional — from the payment receipt in your UPI app">
        <Input id="upi-ref" value={transactionRef} onChange={(e) => onTransactionRef(e.target.value)} maxLength={64} placeholder="e.g. 427812345678" />
      </Field>

      <div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
        {proof ? (
          <div className="flex items-center gap-3">
            <img src={proof} alt="Payment screenshot" className="h-16 w-16 rounded-md border border-border object-cover" />
            <span className="flex-1 text-sm text-muted-foreground">Screenshot attached</span>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove screenshot" onClick={() => onProof(null)}>
              <Trash2 />
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" className="w-full" disabled={reading} onClick={() => fileRef.current?.click()}>
            <Camera /> {reading ? 'Reading…' : 'Attach payment screenshot (optional)'}
          </Button>
        )}
      </div>
    </div>
  );
}
