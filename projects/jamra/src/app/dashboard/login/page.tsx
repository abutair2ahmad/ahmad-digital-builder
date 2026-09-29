import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'تسجيل الدخول' };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="card w-full max-w-sm p-6">
        <h1 className="text-xl font-bold">جمرة · لوحة التحكم</h1>
        <p className="mt-1 text-sm text-muted">دخول صاحب المطعم فقط. التسجيل مسكّر.</p>
        <LoginForm />
      </div>
    </main>
  );
}
