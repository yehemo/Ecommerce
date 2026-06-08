import RegisterForm from '@/components/auth/RegisterForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account — CamboShop',
  description: 'Create a free CamboShop account and start shopping today.',
};

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 space-y-8">
        {/* Heading */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Create your account
          </h1>
          <p className="text-sm text-stone-500">
            Join CamboShop and enjoy exclusive member benefits.
          </p>
        </div>

        <RegisterForm />
      </div>
    </div>
  );
}
