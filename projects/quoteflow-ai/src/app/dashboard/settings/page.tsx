import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { config } from '@/lib/config';
import { requireWorkspace } from '@/lib/workspace/context';
import { BusinessForm, PublicPageForm, QuoteSettingsForm } from './settings-forms';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const ctx = await requireWorkspace();
  return (
    <>
      <PageHeader title="Settings" description="Company details, your public quote page and quote defaults." />
      <BusinessForm workspace={ctx.workspace} />
      <PublicPageForm workspace={ctx.workspace} settings={ctx.settings} appUrl={config.appUrl} />
      <QuoteSettingsForm settings={ctx.settings} />
      <p className="text-xs text-muted-foreground">
        Running in <span className="font-medium">{config.mode === 'supabase' ? 'Supabase' : 'local demo'}</span> mode · AI assistant: <span className="font-medium">{config.anthropic.apiKey ? `Claude (${config.anthropic.model})` : 'guided flow (no ANTHROPIC_API_KEY set)'}</span>
      </p>
    </>
  );
}
