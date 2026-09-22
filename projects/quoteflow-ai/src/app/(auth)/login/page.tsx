import type { Metadata } from 'next';
import { config } from '@/lib/config';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next } = await searchParams;
  const demo = config.mode === 'local' && config.seedDemo ? config.demo : null;
  return <LoginForm next={typeof next === 'string' ? next : undefined} demo={demo} />;
}
