import { Link } from 'react-router-dom';
import { Info, Zap } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

// Building blocks for formal, printable documents (wage slip, payroll sheet, muster roll).
// Black-on-white with ruled tables so they photocopy and print cleanly.

export const businessName = (org) => (org?.name && org.name !== 'Default Organization' ? org.name : 'ElectroStaff');

export function PrintPage({ landscape, className, children }) {
  return (
    <>
      {landscape && <style>{'@page { size: A4 landscape; margin: 8mm; }'}</style>}
      <article
        className={cn(
          'mx-auto w-full rounded-md border border-slate-300 bg-white p-4 text-[13px] leading-snug text-slate-900 sm:p-8',
          landscape ? 'max-w-[297mm]' : 'max-w-[210mm]',
          'print:max-w-none print:rounded-none print:border-0 print:p-0',
          className
        )}
      >
        {children}
      </article>
    </>
  );
}

export function Letterhead({ org, title, subtitle, meta = [] }) {
  const contact = [org?.phone && `Ph: ${org.phone}`, org?.email].filter(Boolean).join('  ·  ');
  return (
    <header className="flex flex-col gap-4 border-b-2 border-slate-900 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white print:[print-color-adjust:exact]">
          <Zap className="h-5 w-5" />
        </span>
        <div>
          <p className="text-lg font-bold uppercase tracking-wide">{businessName(org)}</p>
          {org?.address && <p className="whitespace-pre-line text-slate-600">{org.address}</p>}
          {contact && <p className="text-slate-600">{contact}</p>}
          {org?.ownerName && <p className="text-slate-600">Proprietor: {org.ownerName}</p>}
        </div>
      </div>
      <div className="sm:text-right">
        <p className="text-base font-bold uppercase tracking-[0.2em]">{title}</p>
        {subtitle && <p className="text-xs uppercase tracking-wide text-slate-500">{subtitle}</p>}
        <dl className="mt-2 grid grid-cols-[auto_auto] justify-start gap-x-3 gap-y-0.5 text-xs sm:justify-end">
          {meta.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-slate-500">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}

export function SectionTitle({ children, className }) {
  return (
    <h3 className={cn('mb-1.5 mt-5 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-700', className)}>
      {children}
    </h3>
  );
}

// Label/value rows in a ruled box.
export function KVTable({ rows }) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th className="w-[42%] border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-left text-xs font-medium text-slate-600 print:[print-color-adjust:exact]">
              {label}
            </th>
            <td className="border border-slate-300 px-2.5 py-1.5 font-medium">{value ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DocTable({ className, children }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-[12.5px]', className)}>{children}</table>
    </div>
  );
}

export function Th({ className, ...props }) {
  return (
    <th
      className={cn(
        'border border-slate-300 bg-slate-100 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-700 print:[print-color-adjust:exact]',
        className
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }) {
  return <td className={cn('border border-slate-300 px-2 py-1.5 tabular-nums', className)} {...props} />;
}

export function Signatures({ items }) {
  return (
    <div className="mt-12 grid gap-8 sm:grid-cols-2" style={{ breakInside: 'avoid' }}>
      {items.map(({ label, name }) => (
        <div key={label} className="text-center">
          <div className="h-10" />
          <div className="border-t border-slate-900 pt-1.5 text-xs font-semibold">{label}</div>
          {name && <div className="text-xs text-slate-600">{name}</div>}
        </div>
      ))}
    </div>
  );
}

export function DocFooter({ children }) {
  return (
    <p className="mt-8 border-t border-slate-300 pt-2 text-center text-[11px] text-slate-500">{children}</p>
  );
}

// Nudge (screen only) to fill in the business profile that the letterhead prints.
export function ProfileHint({ org }) {
  if (org?.name && org.name !== 'Default Organization' && org.address) return null;
  return (
    <p className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 print:hidden">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Add your business name, address and phone in{' '}
        <Link to="/settings" className="font-medium underline">Settings</Link> so they print on the letterhead.
      </span>
    </p>
  );
}
