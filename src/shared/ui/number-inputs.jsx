import { useLayoutEffect, useRef } from 'react';
import { Input } from '@/shared/ui/input';
import { cleanPhone, groupIndian, parseAmount } from '@/shared/lib/numberInput';

// Rupee amount typed with Indian grouping (10,000 · 1,00,000). Controlled: `value` is the plain
// number string and `onChange` receives the plain string (use a react-hook-form Controller).
export function AmountInput({ value, onChange, decimals = 0, ref, ...props }) {
  const inputRef = useRef(null);
  const caretDigits = useRef(null); // digits before the caret, restored after re-format
  const raw = value === null || value === undefined ? '' : String(value);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (caretDigits.current === null || !el || document.activeElement !== el) return;
    let seen = 0;
    let pos = 0;
    while (pos < el.value.length && seen < caretDigits.current) {
      if (/[\d.]/.test(el.value[pos])) seen += 1;
      pos += 1;
    }
    el.setSelectionRange(pos, pos);
    caretDigits.current = null;
  });

  const setRefs = (el) => {
    inputRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  return (
    <Input
      {...props}
      ref={setRefs}
      type="text"
      inputMode={decimals ? 'decimal' : 'numeric'}
      autoComplete="off"
      value={groupIndian(raw)}
      onChange={(e) => {
        const { value: text, selectionStart } = e.target;
        caretDigits.current = text.slice(0, selectionStart ?? text.length).replace(/[^\d.]/g, '').length;
        onChange?.(parseAmount(text, { decimals }));
      }}
    />
  );
}

// Mobile number: never grouped; pasted "+91 813882 3410" becomes "8138823410".
// Works with react-hook-form register() and with controlled value/onChange.
export function PhoneInput({ onChange, ...props }) {
  return (
    <Input
      type="tel"
      inputMode="tel"
      maxLength={16}
      placeholder="10-digit mobile"
      {...props}
      onChange={(e) => {
        const clean = cleanPhone(e.target.value);
        if (clean !== e.target.value) e.target.value = clean;
        onChange?.(e);
      }}
    />
  );
}
