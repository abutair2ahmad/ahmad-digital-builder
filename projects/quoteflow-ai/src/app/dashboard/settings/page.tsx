import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { config } from '@/lib/config';
import { fill } from '@/lib/i18n';
import { getI18n } from '@/lib/i18n/server';
import { requireWorkspace } from '@/lib/workspace/context';
import { BusinessForm, LanguageSection, PublicPageForm, QuoteSettingsForm } from './settings-forms';

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.settings.title };
}

export default async function SettingsPage() {
  const ctx = await requireWorkspace();
  const { dict: d } = await getI18n();
  return (
    <>
      <PageHeader title={d.settings.title} description={d.settings.subtitle} />
      <BusinessForm workspace={ctx.workspace} />
      <LanguageSection />
      <PublicPageForm workspace={ctx.workspace} settings={ctx.settings} appUrl={config.appUrl} />
      <QuoteSettingsForm settings={ctx.settings} />
      <p className="text-xs text-muted-foreground">
        {fill(d.settings.runningIn, { mode: config.mode === 'supabase' ? d.settings.modeSupabase : d.settings.modeLocal })} · {d.settings.aiAssistant}:{' '}
        <span className="font-medium">
          {config.anthropic.apiKey ? fill(d.settings.aiClaude, { model: config.anthropic.model }) : d.settings.aiGuided}
        </span>
      </p>
    </>
  );
}
