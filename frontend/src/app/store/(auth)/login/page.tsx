import LoginForm from '@/components/auth/LoginForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — LYH',
  description: 'Sign in to your LYH account to access your orders and wishlist.',
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 space-y-8">
        {/* Heading */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Welcome back
          </h1>
          <p className="text-sm text-stone-500">
            Sign in to your account to continue.
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
