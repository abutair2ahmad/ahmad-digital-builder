'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Field, FormError, SubmitButton, useFormAction } from '@/components/shared/form';
import { BrandColorInput } from '@/components/app/brand-color-input';
import { LogoInput } from '@/components/app/logo-input';
import type { CompanySettings, Workspace } from '@/lib/types';
import { updateBusinessAction, updatePublicPageAction, updateQuoteSettingsAction } from './actions';

const saved = (message: string) => () => toast.success(message);

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 rounded-xl border bg-card p-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="lg:col-span-2">{children}</div>
    </section>
  );
}

export function BusinessForm({ workspace }: { workspace: Workspace }) {
  const [state, action] = useFormAction(updateBusinessAction, saved('Business information saved'));
  const [removeLogo, setRemoveLogo] = useState(false);
  return (
    <Section title="Business information" description="Shown on your public page, in quotes and on the PDF.">
      <form action={action} className="space-y-5">
        <FormError error={state.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" htmlFor="b-name" error={state.fieldErrors?.name} className="sm:col-span-2">
            <Input id="b-name" name="name" defaultValue={workspace.name} required />
          </Field>
          <Field label="Business type" htmlFor="b-type" error={state.fieldErrors?.businessType}>
            <Input id="b-type" name="businessType" defaultValue={workspace.business_type ?? ''} />
          </Field>
          <Field label="Currency" htmlFor="b-currency">
            <Select name="currency" defaultValue={workspace.currency}>
              <SelectTrigger id="b-currency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ILS">ILS</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Phone" htmlFor="b-phone" error={state.fieldErrors?.phone}>
            <Input id="b-phone" name="phone" defaultValue={workspace.phone ?? ''} />
          </Field>
          <Field label="Contact email" htmlFor="b-email" error={state.fieldErrors?.email}>
            <Input id="b-email" name="email" type="email" defaultValue={workspace.email ?? ''} />
          </Field>
          <Field label="Service area" htmlFor="b-area" error={state.fieldErrors?.serviceArea} className="sm:col-span-2">
            <Input id="b-area" name="serviceArea" defaultValue={workspace.service_area ?? ''} />
          </Field>
          <Field label="Primary brand colour" htmlFor="brandColor" error={state.fieldErrors?.brandColor}>
            <BrandColorInput name="brandColor" defaultValue={workspace.brand_color} />
          </Field>
          <Field label="Logo" htmlFor="logo" error={state.fieldErrors?.logo} hint="PNG, JPG, WebP or SVG up to 2 MB. Raster logos also appear on the PDF.">
            <LogoInput name="logo" currentUrl={workspace.logo_path && !removeLogo ? `/api/logo/${workspace.slug}?v=${encodeURIComponent(workspace.updated_at)}` : null} />
            {workspace.logo_path ? (
              <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={removeLogo} onChange={(e) => setRemoveLogo(e.target.checked)} /> Remove current logo
                <input type="hidden" name="remove_logo" value={removeLogo ? 'true' : 'false'} />
              </label>
            ) : null}
          </Field>
        </div>
        <div className="flex justify-end">
          <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
        </div>
      </form>
    </Section>
  );
}

export function PublicPageForm({ workspace, settings, appUrl }: { workspace: Workspace; settings: CompanySettings; appUrl: string }) {
  const [state, action] = useFormAction(updatePublicPageAction, saved('Public page settings saved'));
  const [enabled, setEnabled] = useState(settings.public_page_enabled);
  const [slug, setSlug] = useState(workspace.slug);
  return (
    <Section title="Public quote page" description="The page customers use to describe their project and get an estimate. No account needed on their side.">
      <form action={action} className="space-y-5">
        <FormError error={state.error} />
        <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Page enabled</p>
            <p className="text-xs text-muted-foreground">When off, visitors see a short “not accepting requests” notice.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Public page enabled" />
          <input type="hidden" name="public_page_enabled" value={enabled ? 'true' : 'false'} />
        </div>
        <Field label="Public link" htmlFor="p-slug" error={state.fieldErrors?.slug} hint={`${appUrl}/q/${slug || '…'}`}>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-muted-foreground">/q/</span>
            <Input id="p-slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} required />
            <Button asChild type="button" variant="outline">
              <a href={`/q/${workspace.slug}`} target="_blank" rel="noreferrer">
                Preview
              </a>
            </Button>
          </div>
        </Field>
        <Field label="Headline" htmlFor="p-headline" error={state.fieldErrors?.public_page_headline}>
          <Input id="p-headline" name="public_page_headline" defaultValue={settings.public_page_headline ?? ''} />
        </Field>
        <Field label="Intro" htmlFor="p-intro" error={state.fieldErrors?.public_page_intro}>
          <Textarea id="p-intro" name="public_page_intro" rows={3} defaultValue={settings.public_page_intro ?? ''} />
        </Field>
        <Field label="Thank-you message" htmlFor="p-thanks" error={state.fieldErrors?.public_page_thank_you} hint="Shown after the customer submits their details.">
          <Textarea id="p-thanks" name="public_page_thank_you" rows={3} defaultValue={settings.public_page_thank_you ?? ''} />
        </Field>
        <div className="flex justify-end">
          <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
        </div>
      </form>
    </Section>
  );
}

export function QuoteSettingsForm({ settings }: { settings: CompanySettings }) {
  const [state, action] = useFormAction(updateQuoteSettingsAction, saved('Quote settings saved'));
  return (
    <Section title="Quotes" description="Defaults applied to every new quote.">
      <form action={action} className="space-y-5">
        <FormError error={state.error} />
        <Field label="Default expiration (days)" htmlFor="q-expiry" error={state.fieldErrors?.default_quote_expiry_days}>
          <Input id="q-expiry" name="default_quote_expiry_days" type="number" min={1} max={365} defaultValue={settings.default_quote_expiry_days} className="w-32" required />
        </Field>
        <Field label="Default note on quotes" htmlFor="q-note" error={state.fieldErrors?.quote_footer_note} hint="Terms, what's included, how the final price is confirmed.">
          <Textarea id="q-note" name="quote_footer_note" rows={4} defaultValue={settings.quote_footer_note ?? ''} />
        </Field>
        <div className="flex justify-end">
          <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
        </div>
      </form>
    </Section>
  );
}
