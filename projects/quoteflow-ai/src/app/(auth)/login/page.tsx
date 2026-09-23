import type { Metadata } from 'next';
import { config } from '@/lib/config';
import { getI18n } from '@/lib/i18n/server';
import { LoginForm } from './login-form';

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.common.signIn };
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next } = await searchParams;
  const demo = config.mode === 'local' && config.seedDemo ? config.demo : null;
  return <LoginForm next={typeof next === 'string' ? next : undefined} demo={demo} />;
}
