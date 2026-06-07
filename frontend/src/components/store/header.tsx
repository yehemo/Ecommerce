'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/components/store/cart-provider';

const navLinks = [
  { label: 'New Arrivals', href: '/store/newarrival' },
  { label: 'Women',       href: '/store/women' },
  { label: 'Men',         href: '/store/men' },
  { label: 'Kids',        href: '/store/kids' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { user, logout } = useAuth({});
  const { cartCount } = useCart();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setSearchValue(new URLSearchParams(window.location.search).get('search') || '');
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const query = searchValue.trim();

    if (!query) {
      router.push('/store');
      setDesktopSearchOpen(false);
      setMenuOpen(false);
      return;
    }

    const params = new URLSearchParams();
    params.set('search', query);
    router.push(`/store?${params.toString()}`);
    setDesktopSearchOpen(false);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-stone-100">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link
          href="/store"
          className="text-xl font-light tracking-[0.4em] uppercase text-black shrink-0 hover:opacity-70 transition-opacity"
        >
          CamboShop
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[11px] font-medium tracking-[0.15em] uppercase text-stone-500 hover:text-black transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Search icon */}
          <div className="hidden lg:flex items-center gap-2">
            {desktopSearchOpen && (
              <form onSubmit={submitSearch} className="flex items-center gap-2">
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search products"
                  className="h-9 w-44 xl:w-56 rounded-full border border-stone-200 bg-white px-4 text-sm text-stone-700 outline-none transition-colors focus:border-stone-400"
                />
              </form>
            )}
            <button
              aria-label="Search"
              type="button"
              onClick={() => {
                if (desktopSearchOpen && searchValue.trim()) {
                  const params = new URLSearchParams();
                  params.set('search', searchValue.trim());
                  router.push(`/store?${params.toString()}`);
                  setDesktopSearchOpen(false);
                  return;
                }

                setDesktopSearchOpen((current) => !current);
              }}
              className="p-2 text-stone-500 hover:text-black transition-colors rounded-full hover:bg-stone-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            </button>
          </div>

          {/* Cart icon */}
          <Link
            href="/store/cart"
            aria-label="Cart"
            className="relative p-2 text-stone-500 hover:text-black transition-colors rounded-full hover:bg-stone-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {/* Cart badge */}
            {cartCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-black text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Auth Actions */}
          {user ? (
            <div className="hidden lg:flex items-center gap-2">
              <Link
                href="/store/orders"
                className="text-[11px] font-medium tracking-[0.1em] uppercase text-stone-500 hover:text-black transition-colors border border-stone-200 hover:border-stone-400 rounded-full px-3 py-1.5"
              >
                Orders
              </Link>
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  className="text-[11px] font-medium tracking-[0.1em] uppercase text-stone-500 hover:text-black transition-colors border border-stone-200 hover:border-stone-400 rounded-full px-3 py-1.5"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/store/account"
                className="text-[11px] tracking-wide text-stone-500 transition-colors hover:text-black"
              >
                Hi, {user.name?.split(' ')[0]}
              </Link>
              <button
                onClick={logout}
                className="text-[11px] font-medium tracking-[0.1em] uppercase text-stone-500 hover:text-black transition-colors border border-stone-200 hover:border-stone-400 rounded-full px-3 py-1.5"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-2">
              <Link
                href="/store/login"
                className="text-[11px] font-medium tracking-[0.1em] uppercase text-stone-500 hover:text-black transition-colors px-3 py-1.5"
              >
                Sign in
              </Link>
              <Link
                href="/store/register"
                className="text-[11px] font-medium tracking-[0.1em] uppercase bg-black text-white hover:bg-stone-800 transition-colors rounded-full px-4 py-1.5"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            aria-label="Open menu"
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 text-stone-500 hover:text-black transition-colors rounded-full hover:bg-stone-100"
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-stone-100 px-4 py-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <form onSubmit={submitSearch} className="flex items-center gap-2">
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search products"
              className="h-11 flex-1 rounded-full border border-stone-200 bg-white px-4 text-sm text-stone-700 outline-none transition-colors focus:border-stone-400"
            />
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-black px-4 text-xs font-medium uppercase tracking-[0.1em] text-white transition-colors hover:bg-stone-800"
            >
              Search
            </button>
          </form>

          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium tracking-[0.1em] uppercase text-stone-600 hover:text-black transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="pt-4 border-t border-stone-100 flex flex-col gap-3">
            {user ? (
              <>
                <Link
                  href="/store/account"
                  onClick={() => setMenuOpen(false)}
                  className="text-sm text-stone-500 transition-colors hover:text-black"
                >
                  Hi, {user.name}
                </Link>
                <Link
                  href="/store/orders"
                  onClick={() => setMenuOpen(false)}
                  className="w-full text-center text-sm font-medium tracking-[0.1em] uppercase border border-stone-300 rounded-full py-2.5 text-stone-600 hover:text-black hover:border-black transition-colors"
                >
                  Orders
                </Link>
                <Link
                  href="/store/account"
                  onClick={() => setMenuOpen(false)}
                  className="w-full text-center text-sm font-medium tracking-[0.1em] uppercase border border-stone-300 rounded-full py-2.5 text-stone-600 hover:text-black hover:border-black transition-colors"
                >
                  Account
                </Link>
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="w-full text-center text-sm font-medium tracking-[0.1em] uppercase border border-stone-300 rounded-full py-2.5 text-stone-600 hover:text-black hover:border-black transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="w-full text-center text-sm font-medium tracking-[0.1em] uppercase border border-stone-300 rounded-full py-2.5 text-stone-600 hover:text-black hover:border-black transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/store/login"
                  onClick={() => setMenuOpen(false)}
                  className="w-full text-center text-sm font-medium tracking-[0.1em] uppercase border border-stone-300 rounded-full py-2.5 text-stone-600 hover:text-black hover:border-black transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/store/register"
                  onClick={() => setMenuOpen(false)}
                  className="w-full text-center text-sm font-medium tracking-[0.1em] uppercase bg-black text-white rounded-full py-2.5 hover:bg-stone-800 transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
