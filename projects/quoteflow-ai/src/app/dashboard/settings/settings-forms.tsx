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
import { LanguageSwitcher } from '@/components/app/language-switcher';
import { LogoInput } from '@/components/app/logo-input';
import { useI18n } from '@/lib/i18n/client';
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

export function LanguageSection() {
  const { dict: d } = useI18n();
  return (
    <Section title={d.settings.languageSection} description={d.settings.languageSectionHint}>
      <LanguageSwitcher variant="outline" />
    </Section>
  );
}

export function BusinessForm({ workspace }: { workspace: Workspace }) {
  const { dict: d } = useI18n();
  const [state, action] = useFormAction(updateBusinessAction, saved(d.settings.businessSaved));
  const [removeLogo, setRemoveLogo] = useState(false);
  return (
    <Section title={d.settings.businessSection} description={d.settings.businessSectionHint}>
      <form action={action} className="space-y-5">
        <FormError error={state.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={d.settings.companyName} htmlFor="b-name" error={state.fieldErrors?.name} className="sm:col-span-2">
            <Input id="b-name" name="name" defaultValue={workspace.name} required />
          </Field>
          <Field label={d.settings.businessType} htmlFor="b-type" error={state.fieldErrors?.businessType}>
            <Input id="b-type" name="businessType" defaultValue={workspace.business_type ?? ''} />
          </Field>
          <Field label={d.settings.currency} htmlFor="b-currency">
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
          <Field label={d.settings.phone} htmlFor="b-phone" error={state.fieldErrors?.phone}>
            <Input id="b-phone" name="phone" defaultValue={workspace.phone ?? ''} dir="ltr" />
          </Field>
          <Field label={d.settings.contactEmail} htmlFor="b-email" error={state.fieldErrors?.email}>
            <Input id="b-email" name="email" type="email" defaultValue={workspace.email ?? ''} dir="ltr" />
          </Field>
          <Field label={d.settings.serviceArea} htmlFor="b-area" error={state.fieldErrors?.serviceArea} className="sm:col-span-2">
            <Input id="b-area" name="serviceArea" defaultValue={workspace.service_area ?? ''} />
          </Field>
          <Field label={d.settings.brandColour} htmlFor="brandColor" error={state.fieldErrors?.brandColor}>
            <BrandColorInput name="brandColor" defaultValue={workspace.brand_color} />
          </Field>
          <Field label={d.settings.logo} htmlFor="logo" error={state.fieldErrors?.logo} hint={d.settings.logoHint}>
            <LogoInput name="logo" currentUrl={workspace.logo_path && !removeLogo ? `/api/logo/${workspace.slug}?v=${encodeURIComponent(workspace.updated_at)}` : null} />
            {workspace.logo_path ? (
              <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={removeLogo} onChange={(e) => setRemoveLogo(e.target.checked)} /> {d.settings.removeLogo}
                <input type="hidden" name="remove_logo" value={removeLogo ? 'true' : 'false'} />
              </label>
            ) : null}
          </Field>
        </div>
        <div className="flex justify-end">
          <SubmitButton pendingText={d.common.saving}>{d.common.saveChanges}</SubmitButton>
        </div>
      </form>
    </Section>
  );
}

export function PublicPageForm({ workspace, settings, appUrl }: { workspace: Workspace; settings: CompanySettings; appUrl: string }) {
  const { dict: d, href } = useI18n();
  const [state, action] = useFormAction(updatePublicPageAction, saved(d.settings.publicSaved));
  const [enabled, setEnabled] = useState(settings.public_page_enabled);
  const [slug, setSlug] = useState(workspace.slug);
  return (
    <Section title={d.settings.publicSection} description={d.settings.publicSectionHint}>
      <form action={action} className="space-y-5">
        <FormError error={state.error} />
        <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">{d.settings.pageEnabled}</p>
            <p className="text-xs text-muted-foreground">{d.settings.pageEnabledHint}</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label={d.settings.pageEnabled} />
          <input type="hidden" name="public_page_enabled" value={enabled ? 'true' : 'false'} />
        </div>
        <Field label={d.settings.publicLink} htmlFor="p-slug" error={state.fieldErrors?.slug} hint={`${appUrl}/q/${slug || '…'}`}>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-muted-foreground" dir="ltr">
              /q/
            </span>
            <Input id="p-slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} required dir="ltr" />
            <Button asChild type="button" variant="outline">
              <a href={href(`/q/${workspace.slug}`)} target="_blank" rel="noreferrer">
                {d.settings.preview}
              </a>
            </Button>
          </div>
        </Field>
        <Field label={d.settings.headline} htmlFor="p-headline" error={state.fieldErrors?.public_page_headline}>
          <Input id="p-headline" name="public_page_headline" defaultValue={settings.public_page_headline ?? ''} />
        </Field>
        <Field label={d.settings.intro} htmlFor="p-intro" error={state.fieldErrors?.public_page_intro}>
          <Textarea id="p-intro" name="public_page_intro" rows={3} defaultValue={settings.public_page_intro ?? ''} />
        </Field>
        <Field label={d.settings.thankYou} htmlFor="p-thanks" error={state.fieldErrors?.public_page_thank_you} hint={d.settings.thankYouHint}>
          <Textarea id="p-thanks" name="public_page_thank_you" rows={3} defaultValue={settings.public_page_thank_you ?? ''} />
        </Field>
        <div className="flex justify-end">
          <SubmitButton pendingText={d.common.saving}>{d.common.saveChanges}</SubmitButton>
        </div>
      </form>
    </Section>
  );
}

export function QuoteSettingsForm({ settings }: { settings: CompanySettings }) {
  const { dict: d } = useI18n();
  const [state, action] = useFormAction(updateQuoteSettingsAction, saved(d.settings.quotesSaved));
  return (
    <Section title={d.settings.quotesSection} description={d.settings.quotesSectionHint}>
      <form action={action} className="space-y-5">
        <FormError error={state.error} />
        <Field label={d.settings.defaultExpiry} htmlFor="q-expiry" error={state.fieldErrors?.default_quote_expiry_days}>
          <Input id="q-expiry" name="default_quote_expiry_days" type="number" min={1} max={365} defaultValue={settings.default_quote_expiry_days} className="w-32" required />
        </Field>
        <Field label={d.settings.defaultNote} htmlFor="q-note" error={state.fieldErrors?.quote_footer_note} hint={d.settings.defaultNoteHint}>
          <Textarea id="q-note" name="quote_footer_note" rows={4} defaultValue={settings.quote_footer_note ?? ''} />
        </Field>
        <div className="flex justify-end">
          <SubmitButton pendingText={d.common.saving}>{d.common.saveChanges}</SubmitButton>
        </div>
      </form>
    </Section>
  );
}
