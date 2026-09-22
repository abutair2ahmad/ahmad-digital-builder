'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { FormState } from '@/lib/validation';
import type { ComponentProps, ReactNode } from 'react';

export function SubmitButton({ children, pendingText, className, ...props }: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} className={className} {...props}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" /> {pendingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export function Field({ label, htmlFor, error, hint, children, className }: { label: string; htmlFor?: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-danger-soft px-3 py-2 text-sm text-destructive">
      {error}
    </div>
  );
}

/**
 * `useActionState` with a success hook that runs inside the action itself,
 * so dialogs can close and toast without a setState-in-effect.
 */
export function useFormAction(action: (prev: FormState, formData: FormData) => Promise<FormState>, onSuccess?: (state: FormState) => void) {
  return useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result.ok) onSuccess?.(result);
    return result;
  }, {});
}
