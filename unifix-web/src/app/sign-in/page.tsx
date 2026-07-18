'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Spinner } from '@/components/Spinner';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const DEMO_ACCOUNTS = [
  { label: 'Administrator', email: 'admin@uni.edu' },
  { label: 'Maintenance Officer', email: 'officer@uni.edu' },
  { label: 'Student / Staff', email: 'student@uni.edu' },
];

export default function SignInPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState<string | null>(null);

  const doLogin = async (
    loginEmail: string,
    loginPassword: string,
    demoLabel?: string,
  ) => {
    setError(null);
    setSubmitting(true);
    if (demoLabel) setLoadingAccount(demoLabel);
    try {
      await login(loginEmail, loginPassword);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
      setSubmitting(false);
      setLoadingAccount(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(email, password);
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-navy px-16 py-16 text-white md:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded border border-gold text-gold font-serif text-lg">
            U
          </div>
          <div className="leading-tight">
            <div className="font-serif text-lg">UniFix</div>
            <div className="text-[10px] tracking-widest text-neutral-300">
              MAINTENANCE PORTAL
            </div>
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs tracking-[0.3em] text-gold">
            ACCOUNTABLE · TRACKED · FAST
          </p>
          <h1 className="font-serif text-4xl leading-tight">
            One place for every campus request.
          </h1>
          <p className="mt-4 max-w-sm text-neutral-300">
            Report faults, follow progress, and close the loop between the
            community and the people who fix things.
          </p>
        </div>
        <p className="text-xs text-neutral-400">
          © 2026 UniFix — MIT 8333 Continuous Assessment By Stephen Adebanji
          <br />
          Matric Number: 2025/A/MIT/0334 · Student ID: 301815200
        </p>
      </div>

      <div className="flex w-full items-center justify-center bg-cream px-8 py-16 md:w-1/2">
        <div className="w-full max-w-sm">
          <h2 className="font-serif text-3xl text-navy">Sign in</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Access the UniFix maintenance portal with your university account.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-navy"
              >
                University email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@uni.edu"
                className="w-full rounded border border-neutral-300 px-3 py-2 focus:border-gold focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-navy"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-neutral-300 px-3 py-2 focus:border-gold focus:outline-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded bg-navy py-2.5 font-medium text-white hover:bg-navy-light disabled:opacity-60"
            >
              {submitting && !loadingAccount && (
                <Spinner className="h-4 w-4 text-white" />
              )}
              {submitting && !loadingAccount ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="text-center text-sm text-neutral-600">
              New here?{' '}
              <Link href="/register" className="underline">
                Create an account
              </Link>
            </p>
          </form>

          <div className="mt-8 border-t border-neutral-200 pt-6">
            <p className="mb-3 text-xs tracking-widest text-gold">
              DEMO ACCOUNTS
            </p>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((account) => {
                const isLoadingThis = loadingAccount === account.label;
                return (
                  <button
                    key={account.email}
                    type="button"
                    disabled={submitting}
                    onClick={() =>
                      doLogin(account.email, 'password123', account.label)
                    }
                    className="flex w-full items-center justify-between rounded border border-neutral-200 bg-white px-4 py-2.5 text-sm hover:border-gold disabled:opacity-60"
                  >
                    <span>{account.label}</span>
                    {isLoadingThis ? (
                      <span className="flex items-center gap-2 text-navy">
                        <Spinner className="h-4 w-4" />
                        Signing in…
                      </span>
                    ) : (
                      <span className="text-neutral-400">Use →</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
