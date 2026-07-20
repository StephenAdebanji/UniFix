'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { PriorityBadge, StatusBadge } from '@/components/Badge';
import { RequireAuth } from '@/components/RequireAuth';
import { Footer } from '@/components/Footer';
import { LoadingScreen } from '@/components/Spinner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { PublicUser, RequestSummary } from '@/lib/types';

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between text-xs tracking-widest text-neutral-500">
        {label}
        <span>{icon}</span>
      </div>
      <div className="mt-2 font-serif text-3xl text-navy">{value}</div>
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const reqRes = await api.requests.list({ limit: 100 });
      if (cancelled) return;
      setRequests(reqRes.items);
      if (user?.role === 'ADMINISTRATOR') {
        const userList = await api.users.list();
        if (!cancelled) setUsers(userList);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  if (loading) {
    return <LoadingScreen />;
  }

  const awaitingAction = requests.filter(
    (r) => r.status === 'PENDING' || r.status === 'ASSIGNED',
  ).length;
  const inProgress = requests.filter(
    (r) => r.status === 'ACCEPTED' || r.status === 'IN_PROGRESS',
  ).length;
  const resolved = requests.filter((r) => r.status === 'RESOLVED').length;

  const recent = requests.slice(0, 5);

  const heading =
    user?.role === 'ADMINISTRATOR'
      ? 'ADMINISTRATOR DASHBOARD'
      : user?.role === 'MAINTENANCE_OFFICER'
        ? 'MAINTENANCE OFFICER DASHBOARD'
        : 'STUDENT / STAFF DASHBOARD';

  const subtitle =
    user?.role === 'ADMINISTRATOR'
      ? 'Monitor every request across campus, assign officers, and manage users.'
      : user?.role === 'MAINTENANCE_OFFICER'
        ? 'Review the jobs assigned to you and update their progress.'
        : 'Track your submitted requests and log new maintenance issues.';

  const firstName = user?.name.split(' ')[0];

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <p className="text-xs tracking-widest text-gold">{heading}</p>
      <div className="mt-1 flex items-center justify-between">
        <h1 className="font-serif text-4xl text-navy">Good day, {firstName}.</h1>
        {user?.role === 'STUDENT_STAFF' && (
          <Link
            href="/requests/new"
            className="rounded bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-light"
          >
            + New request
          </Link>
        )}
      </div>
      <p className="mt-2 text-neutral-600">{subtitle}</p>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label={
            user?.role === 'ADMINISTRATOR'
              ? 'ALL REQUESTS'
              : user?.role === 'MAINTENANCE_OFFICER'
                ? 'ASSIGNED'
                : 'MY REQUESTS'
          }
          value={requests.length}
          icon="📋"
        />
        <StatCard label="AWAITING ACTION" value={awaitingAction} icon="⏱" />
        <StatCard label="IN PROGRESS" value={inProgress} icon="🔧" />
        <StatCard label="RESOLVED" value={resolved} icon="✅" />
      </div>

      {user?.role === 'ADMINISTRATOR' && (
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="OFFICERS"
            value={users.filter((u) => u.role === 'MAINTENANCE_OFFICER').length}
            icon="🔧"
          />
          <StatCard
            label="STUDENTS / STAFF"
            value={users.filter((u) => u.role === 'STUDENT_STAFF').length}
            icon="🎓"
          />
          <StatCard
            label="UNASSIGNED"
            value={requests.filter((r) => !r.assignedTo).length}
            icon="⚠️"
          />
          <StatCard
            label="HIGH PRIORITY"
            value={requests.filter((r) => r.priority === 'HIGH').length}
            icon="⚠️"
          />
        </div>
      )}

      <div className="mt-8 rounded-lg border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-medium text-navy">Recent activity</h2>
          <Link href="/requests" className="text-sm text-neutral-600 hover:text-gold">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-6 py-10 text-center text-neutral-500">
            No requests yet.
          </p>
        ) : (
          <div>
            {recent.map((r) => (
              <Link
                key={r.id}
                href={`/requests/${r.id}`}
                className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 last:border-0 hover:bg-neutral-50"
              >
                <div>
                  <div className="text-xs text-neutral-500">{r.code}</div>
                  <div className="font-medium text-navy">{r.title}</div>
                  <div className="text-sm text-neutral-500">
                    {r.category} · {r.location}
                  </div>
                </div>
                <div className="flex gap-2">
                  <PriorityBadge priority={r.priority} />
                  <StatusBadge status={r.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Navbar />
      <DashboardContent />
      <Footer />
    </RequireAuth>
  );
}
