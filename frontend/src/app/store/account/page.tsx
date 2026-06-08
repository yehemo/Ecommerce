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
import { ArrowLeft, Loader2, LockKeyhole, Package, Settings, Shield, UserCircle2 } from 'lucide-react';

type FieldErrors = Record<string, string[]>;
type ApiErrorPayload = {
  errors?: FieldErrors;
  message?: string;
};
type AccountTab = 'overview' | 'profile' | 'password' | 'addresses';

const tabs: Array<{ id: AccountTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'profile', label: 'Profile' },
  { id: 'password', label: 'Password' },
  { id: 'addresses', label: 'Addresses' },
];

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, error: authError, refreshUser } = useAuth({});

  const [activeTab, setActiveTab] = useState<AccountTab>('overview');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileErrors, setProfileErrors] = useState<FieldErrors>({});
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({});
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

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
    setIsSavingProfile(true);
    setProfileErrors({});
    setProfileMessage(null);

    try {
      await axios.patch('/api/user', { name, email });
      await refreshUser();
      setProfileMessage('Profile updated successfully.');
    } catch (error) {
      const response = (error as AxiosError<ApiErrorPayload>).response;

      if (response?.status === 422 && response.data?.errors) {
        setProfileErrors(response.data.errors);
      } else {
        setProfileMessage(response?.data?.message ?? 'Unable to update your profile right now.');
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const savePassword = async () => {
    setIsSavingPassword(true);
    setPasswordErrors({});
    setPasswordMessage(null);

    try {
      await axios.patch('/api/user/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: passwordConfirmation,
      });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordConfirmation('');
      setPasswordMessage('Password updated successfully.');
    } catch (error) {
      const response = (error as AxiosError<ApiErrorPayload>).response;

      if (response?.status === 422 && response.data?.errors) {
        setPasswordErrors(response.data.errors);
      } else {
        setPasswordMessage(response?.data?.message ?? 'Unable to update your password right now.');
      }
    } finally {
      setIsSavingPassword(false);
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
              Manage your profile, password, and saved addresses from one account space.
            </p>
          </div>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
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

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? 'border-black bg-black text-white'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:text-black'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'overview' && (
            <Card className="border-stone-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle2 className="h-5 w-5" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-stone-600">
                <p>
                  Review your account identity, open your order history, and jump back into shopping or admin management from one place.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Name</p>
                    <p className="mt-2 font-medium text-black">{user?.name}</p>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Email</p>
                    <p className="mt-2 font-medium text-black">{user?.email}</p>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Role</p>
                    <p className="mt-2 font-medium text-black capitalize">{user?.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'profile' && (
            <Card className="border-stone-200">
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profileMessage && (
                  <div className={`rounded-2xl px-4 py-3 text-sm ${Object.keys(profileErrors).length === 0 ? 'border border-stone-200 bg-stone-50 text-stone-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
                    {profileMessage}
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
                  {profileErrors.name?.[0] && <p className="mt-1 text-xs text-red-600">{profileErrors.name[0]}</p>}
                </div>

                <div>
                  <Label htmlFor="account-email">Email</Label>
                  <Input
                    id="account-email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2"
                  />
                  {profileErrors.email?.[0] && <p className="mt-1 text-xs text-red-600">{profileErrors.email[0]}</p>}
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveProfile} disabled={isSavingProfile}>
                    {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'password' && (
            <Card className="border-stone-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LockKeyhole className="h-5 w-5" />
                  Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {passwordMessage && (
                  <div className={`rounded-2xl px-4 py-3 text-sm ${Object.keys(passwordErrors).length === 0 ? 'border border-stone-200 bg-stone-50 text-stone-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
                    {passwordMessage}
                  </div>
                )}

                <div>
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="mt-2"
                    autoComplete="current-password"
                  />
                  {passwordErrors.current_password?.[0] && (
                    <p className="mt-1 text-xs text-red-600">{passwordErrors.current_password[0]}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="mt-2"
                    autoComplete="new-password"
                  />
                  {passwordErrors.password?.[0] && (
                    <p className="mt-1 text-xs text-red-600">{passwordErrors.password[0]}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordConfirmation}
                    onChange={(event) => setPasswordConfirmation(event.target.value)}
                    className="mt-2"
                    autoComplete="new-password"
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={savePassword} disabled={isSavingPassword}>
                    {isSavingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Update password
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'addresses' && <SavedAddressesManager />}
        </div>
      </section>
    </main>
  );
}
