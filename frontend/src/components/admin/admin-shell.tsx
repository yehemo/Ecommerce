'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Inventory', href: '/admin/inventory' },
  { label: 'Products', href: '/admin/products' },
  { label: 'Categories', href: '/admin/categories' },
];

export function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading } = useAuth({});

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.replace('/store');
    }
  }, [isLoading, router, user]);

  if (isLoading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-stone-500">Admin</p>
          <p className="text-lg font-medium">Checking access…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-4 lg:flex-row lg:px-6">
        <aside className="w-full rounded-[2rem] border border-white/10 bg-stone-950/90 p-5 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-72 lg:flex-none">
          <div className="space-y-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500">CamboShop Admin</p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Control Room</h1>
              <p className="mt-2 text-sm text-stone-400">
                Manage products, inventory, and fulfillment from one place.
              </p>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = item.href === '/admin'
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-2xl px-4 py-3 text-sm transition ${
                      isActive
                        ? 'bg-stone-100 text-stone-950 shadow-lg'
                        : 'text-stone-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-8 space-y-3 border-t border-white/10 pt-5">
            <div className="rounded-2xl bg-stone-900 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Signed in</p>
              <p className="mt-2 text-sm font-medium text-white">{user.name}</p>
              <p className="mt-1 text-sm text-stone-400">{user.email}</p>
            </div>
            <Link
              href="/store"
              className="block rounded-full border border-white/15 px-4 py-3 text-center text-sm font-medium text-stone-300 transition hover:border-white/30 hover:text-white"
            >
              Back to Store
            </Link>
            <button
              onClick={logout}
              className="w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-200"
            >
              Logout
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
