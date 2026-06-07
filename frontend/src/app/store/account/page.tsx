'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import type { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { SavedAddressesManager } from '@/components/store/saved-addresses-manager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Package, Settings, Shield } from 'lucide-react';

type FieldErrors = Record<string, string[]>;
type ApiErrorPayload = {
  errors?: FieldErrors;
  message?: string;
};

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, error: authError, refreshUser } = useAuth({});

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user && authError) {
      router.replace('/store/login?next=/store/account');
    }
  }, [authError, authLoading, router, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setName(user.name ?? '');
    setEmail(user.email ?? '');
  }, [user]);

  const saveProfile = async () => {
    setIsSaving(true);
    setErrors({});
    setMessage(null);

    try {
      await axios.patch('/api/user', { name, email });
      await refreshUser();
      setMessage('Profile updated successfully.');
    } catch (error) {
      const response = (error as AxiosError<ApiErrorPayload>).response;

      if (response?.status === 422 && response.data?.errors) {
        setErrors(response.data.errors);
      } else {
        setMessage(response?.data?.message ?? 'Unable to update your profile right now.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!authLoading && !user) {
    return null;
  }

  return (
    <main className="mx-auto flex w-full max-w-screen-xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/store"
            className="inline-flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue shopping
          </Link>
          <div>
            <h1 className="text-3xl font-light tracking-[0.12em] text-black uppercase">My Account</h1>
            <p className="mt-2 max-w-2xl text-sm text-stone-500">
              Update your profile and manage the saved addresses you reuse across checkout.
            </p>
          </div>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle>Account Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Signed in as</p>
              <p className="text-xl font-medium text-black">{user?.name}</p>
              <p className="text-sm text-stone-500">{user?.email}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Role</p>
                <p className="mt-2 text-sm font-medium text-black capitalize">{user?.role}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Account status</p>
                <p className="mt-2 text-sm font-medium text-black capitalize">{user?.status}</p>
              </div>
            </div>

            <div className="grid gap-3">
              <Link
                href="/store/orders"
                className="inline-flex items-center justify-between rounded-2xl border border-stone-200 px-4 py-3 text-sm text-stone-600 transition-colors hover:border-stone-400 hover:text-black"
              >
                <span className="inline-flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  My Orders
                </span>
                <span>Open</span>
              </Link>
              <Link
                href="/store"
                className="inline-flex items-center justify-between rounded-2xl border border-stone-200 px-4 py-3 text-sm text-stone-600 transition-colors hover:border-stone-400 hover:text-black"
              >
                <span className="inline-flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Continue Shopping
                </span>
                <span>Browse</span>
              </Link>
              {user?.role === 'admin' && (
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-between rounded-2xl border border-stone-200 px-4 py-3 text-sm text-stone-600 transition-colors hover:border-stone-400 hover:text-black"
                >
                  <span className="inline-flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Admin Dashboard
                  </span>
                  <span>Open</span>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <div className={`rounded-2xl px-4 py-3 text-sm ${Object.keys(errors).length === 0 ? 'border border-stone-200 bg-stone-50 text-stone-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
                {message}
              </div>
            )}

            <div>
              <Label htmlFor="account-name">Full name</Label>
              <Input
                id="account-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2"
              />
              {errors.name?.[0] && <p className="mt-1 text-xs text-red-600">{errors.name[0]}</p>}
            </div>

            <div>
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2"
              />
              {errors.email?.[0] && <p className="mt-1 text-xs text-red-600">{errors.email[0]}</p>}
            </div>

            <div className="flex justify-end">
              <Button onClick={saveProfile} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <SavedAddressesManager />
    </main>
  );
}
