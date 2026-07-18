'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await register({ name, email, password, department: department || undefined });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
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
          © 2026 UniFix — MIT 8333 Continuous Assessment.
        </p>
      </div>

      <div className="flex w-full items-center justify-center bg-cream px-8 py-16 md:w-1/2">
        <div className="w-full max-w-sm">
          <h2 className="font-serif text-3xl text-navy">Create your account</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Students and staff can register directly. Officers and admins are
            provisioned by the facilities office.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-navy"
              >
                Full name
              </label>
              <input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-neutral-300 px-3 py-2 focus:border-gold focus:outline-none"
              />
            </div>
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
                className="w-full rounded border border-neutral-300 px-3 py-2 focus:border-gold focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="department"
                className="mb-1 block text-sm font-medium text-navy"
              >
                Department (optional)
              </label>
              <input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full rounded border border-neutral-300 px-3 py-2 focus:border-gold focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border border-neutral-300 px-3 py-2 focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="confirm"
                  className="mb-1 block text-sm font-medium text-navy"
                >
                  Confirm
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded border border-neutral-300 px-3 py-2 focus:border-gold focus:outline-none"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-navy py-2.5 font-medium text-white hover:bg-navy-light disabled:opacity-60"
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>

            <p className="text-center text-sm text-neutral-600">
              Already have an account?{' '}
              <Link href="/sign-in" className="underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
