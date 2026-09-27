import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

// Label + control + hint/error, the one form-row contract used across every form.
export function Field({ label, htmlFor, error, hint, required, className, children }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
          {label}
          {required && <span className="ml-0.5 text-red-600">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
