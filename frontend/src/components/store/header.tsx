'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/components/store/cart-provider';

const navLinks = [
  { label: 'New Arrivals', href: '/store/newarrival' },
  { label: 'Women',       href: '/store/women' },
  { label: 'Men',         href: '/store/men' },
  { label: 'Kids',        href: '/store/kids' },
  { label: 'Sale',        href: '/store/sale' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth({});
  const { cartCount } = useCart();

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
        <nav className="hidden md:flex items-center gap-8">
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
          <button
            aria-label="Search"
            className="hidden sm:flex p-2 text-stone-500 hover:text-black transition-colors rounded-full hover:bg-stone-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </button>

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
            <div className="hidden sm:flex items-center gap-2">
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  className="text-[11px] font-medium tracking-[0.1em] uppercase text-stone-500 hover:text-black transition-colors border border-stone-200 hover:border-stone-400 rounded-full px-3 py-1.5"
                >
                  Admin
                </Link>
              )}
              <span className="text-[11px] tracking-wide text-stone-500">
                Hi, {user.name?.split(' ')[0]}
              </span>
              <button
                onClick={logout}
                className="text-[11px] font-medium tracking-[0.1em] uppercase text-stone-500 hover:text-black transition-colors border border-stone-200 hover:border-stone-400 rounded-full px-3 py-1.5"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
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
            className="md:hidden p-2 text-stone-500 hover:text-black transition-colors rounded-full hover:bg-stone-100"
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
        <div className="md:hidden bg-white border-t border-stone-100 px-4 py-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
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
                <p className="text-sm text-stone-500">Hi, {user.name}</p>
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
