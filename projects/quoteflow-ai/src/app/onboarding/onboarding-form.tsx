'use client';

import { useActionState, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FormError, SubmitButton } from '@/components/shared/form';
import { BrandColorInput } from '@/components/app/brand-color-input';
import { LogoInput } from '@/components/app/logo-input';
import { createWorkspaceAction } from './actions';

const BUSINESS_TYPES = ['Painting & renovation', 'Cleaning services', 'Landscaping', 'Moving & delivery', 'Electrical', 'Plumbing', 'Roofing', 'Flooring & tiling', 'HVAC', 'Handyman', 'Other'];

export function OnboardingForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, action] = useActionState(createWorkspaceAction, {});
  const [businessType, setBusinessType] = useState('Painting & renovation');
  return (
    <form action={action} className="space-y-6">
      <FormError error={state.error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Company name" htmlFor="name" error={state.fieldErrors?.name} className="sm:col-span-2">
          <Input id="name" name="name" required placeholder="Levi Painting & Renovation" />
        </Field>
        <Field label="Business type" htmlFor="businessType" error={state.fieldErrors?.businessType}>
          <Select value={businessType} onValueChange={setBusinessType}>
            <SelectTrigger id="businessType" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="businessType" value={businessType} />
        </Field>
        <Field label="Currency" htmlFor="currency">
          <Select name="currency" defaultValue="ILS">
            <SelectTrigger id="currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ILS">ILS — Israeli shekel</SelectItem>
              <SelectItem value="USD">USD — US dollar</SelectItem>
              <SelectItem value="EUR">EUR — Euro</SelectItem>
              <SelectItem value="GBP">GBP — British pound</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Phone" htmlFor="phone" error={state.fieldErrors?.phone}>
          <Input id="phone" name="phone" type="tel" required placeholder="+972-2-000-0000" />
        </Field>
        <Field label="Business email" htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" required defaultValue={defaultEmail} />
        </Field>
        <Field label="Service area" htmlFor="serviceArea" error={state.fieldErrors?.serviceArea} className="sm:col-span-2" hint="Shown to customers and used by the assistant when it asks for a location.">
          <Input id="serviceArea" name="serviceArea" required placeholder="Jerusalem, Tel Aviv and the central district" />
        </Field>
        <Field label="Brand colour" htmlFor="brandColor" error={state.fieldErrors?.brandColor}>
          <BrandColorInput name="brandColor" defaultValue="#2563eb" />
        </Field>
        <Field label="Logo (optional)" htmlFor="logo" error={state.fieldErrors?.logo} hint="PNG, JPG, WebP or SVG up to 2 MB.">
          <LogoInput name="logo" />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-3 border-t pt-5">
        <SubmitButton pendingText="Creating workspace…">Create workspace</SubmitButton>
      </div>
    </form>
  );
}
