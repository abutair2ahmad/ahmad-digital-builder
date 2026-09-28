'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FormError, SubmitButton, useFormAction } from '@/components/shared/form';
import { BrandColorInput } from '@/components/app/brand-color-input';
import { LogoInput } from '@/components/app/logo-input';
import { useI18n } from '@/lib/i18n/client';
import { createWorkspaceAction } from './actions';

const TYPE_KEYS = ['painting', 'cleaning', 'landscaping', 'moving', 'electrical', 'plumbing', 'roofing', 'flooring', 'hvac', 'handyman', 'other'] as const;

export function OnboardingForm({ defaultEmail }: { defaultEmail: string }) {
  const { dict: d } = useI18n();
  const [state, action] = useFormAction(createWorkspaceAction);
  const [businessType, setBusinessType] = useState(d.onboarding.types.painting);
  return (
    <form action={action} className="space-y-6">
      <FormError error={state.error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={d.onboarding.companyName} htmlFor="name" error={state.fieldErrors?.name} className="sm:col-span-2">
          <Input id="name" name="name" required placeholder="Levi Painting & Renovation" />
        </Field>
        <Field label={d.onboarding.businessType} htmlFor="businessType" error={state.fieldErrors?.businessType}>
          <Select value={businessType} onValueChange={setBusinessType}>
            <SelectTrigger id="businessType" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_KEYS.map((key) => (
                <SelectItem key={key} value={d.onboarding.types[key]}>
                  {d.onboarding.types[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="businessType" value={businessType} />
        </Field>
        <Field label={d.onboarding.currency} htmlFor="currency">
          <Select name="currency" defaultValue="ILS">
            <SelectTrigger id="currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ILS">ILS — ₪</SelectItem>
              <SelectItem value="USD">USD — $</SelectItem>
              <SelectItem value="EUR">EUR — €</SelectItem>
              <SelectItem value="GBP">GBP — £</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={d.onboarding.phone} htmlFor="phone" error={state.fieldErrors?.phone}>
          <Input id="phone" name="phone" type="tel" required placeholder="+972-2-000-0000" dir="ltr" />
        </Field>
        <Field label={d.onboarding.businessEmail} htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" required defaultValue={defaultEmail} dir="ltr" />
        </Field>
        <Field
          label={d.onboarding.serviceArea}
          htmlFor="serviceArea"
          error={state.fieldErrors?.serviceArea}
          className="sm:col-span-2"
          hint={d.onboarding.serviceAreaHint}
        >
          <Input id="serviceArea" name="serviceArea" required />
        </Field>
        <Field label={d.onboarding.brandColour} htmlFor="brandColor" error={state.fieldErrors?.brandColor}>
          <BrandColorInput name="brandColor" defaultValue="#2563eb" />
        </Field>
        <Field label={d.onboarding.logoOptional} htmlFor="logo" error={state.fieldErrors?.logo} hint={d.onboarding.logoHint}>
          <LogoInput name="logo" />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-3 border-t pt-5">
        <SubmitButton pendingText={d.onboarding.creatingWorkspace}>{d.onboarding.createWorkspace}</SubmitButton>
      </div>
    </form>
  );
}
