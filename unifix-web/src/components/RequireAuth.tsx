'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
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

  if (loading || !user || (roles && !roles.includes(user.role))) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-neutral-500">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
