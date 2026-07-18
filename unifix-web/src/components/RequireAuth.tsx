'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingScreen } from '@/components/Spinner';
import { useAuth } from '@/lib/auth-context';
import type { RoleName } from '@/lib/types';

export function RequireAuth({
  roles,
  children,
}: {
  roles?: RoleName[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/sign-in');
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [loading, user, roles, router]);

  // Still resolving the session on first load — show a spinner.
  if (loading) {
    return <LoadingScreen />;
  }

  // No user, or wrong role — a redirect is already underway (see effect
  // above). Render nothing rather than a spinner so sign-out and role
  // redirects feel instant instead of flashing a loading state.
  if (!user || (roles && !roles.includes(user.role))) {
    return null;
  }

  return <>{children}</>;
}
