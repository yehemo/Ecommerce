'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<any>([]);
    const router = useRouter();

    const { login, isLoading } = useAuth({
        middleware: 'guest',
    });

    const submitForm = async (event: React.FormEvent) => {
        event.preventDefault();
        const user = await login({ email, password, setErrors });
        if (user) {
            const next = typeof window !== 'undefined'
                ? new URLSearchParams(window.location.search).get('next')
                : null;
            router.push(next || (user.role === 'admin' ? '/admin' : '/store'));
        }
    };

    if (isLoading) return <div className="flex justify-center py-4"><span className="text-zinc-500">Loading session...</span></div>;

    return (
        <form onSubmit={submitForm} className="space-y-6">
            <div>
                <label htmlFor="email" className="block text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100">
                    Email address
                </label>
                <div className="mt-2">
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="block w-full rounded-md border-0 py-2.5 px-3.5 text-zinc-900 dark:text-zinc-100 dark:bg-zinc-800/50 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:focus:ring-indigo-500 sm:text-sm sm:leading-6 transition-all"
                        placeholder="you@example.com"
                    />
                    {errors.email && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.email[0]}</p>}
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100">
                        Password
                    </label>
                    <div className="text-sm">
                        <Link href="/forgot-password" className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
                            Forgot password?
                        </Link>
                    </div>
                </div>
                <div className="mt-2">
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="block w-full rounded-md border-0 py-2.5 px-3.5 text-zinc-900 dark:text-zinc-100 dark:bg-zinc-800/50 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:focus:ring-indigo-500 sm:text-sm sm:leading-6 transition-all"
                        placeholder="••••••••"
                    />
                    {errors.password && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.password[0]}</p>}
                </div>
            </div>

            <div>
                <button
                    type="submit"
                    className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-all active:scale-[0.98]"
                >
                    Sign in
                </button>
            </div>
            
            <p className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Not a member?{' '}
                <Link href="/store/register" className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
                    Create an account
                </Link>
            </p>
        </form>
    );
}
