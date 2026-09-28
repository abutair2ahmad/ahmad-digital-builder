import type { Metadata } from 'next';
import { SignupForm } from './signup-form';
import { getI18n } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.auth.createYourAccount };
}

export default function SignupPage() {
  return <SignupForm />;
}
