'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { PriorityBadge, StatusBadge } from '@/components/Badge';
import { RequireAuth } from '@/components/RequireAuth';
import { Footer } from '@/components/Footer';
import { Spinner } from '@/components/Spinner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Category, RequestSummary, RequestStatus } from '@/lib/types';

const STATUS_OPTIONS: { value: RequestStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
];

function RequestsContent() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<RequestStatus | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.categories.list().then(setCategories);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.requests
      .list({
        search: search || undefined,
        status: status || undefined,
        categoryId: categoryId || undefined,
        limit: 100,
      })
      .then((res) => {
        if (!cancelled) setRequests(res.items);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, status, categoryId]);

  const handleExport = async () => {
    const csv = await api.requests.exportCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'service-requests.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const title =
    user?.role === 'ADMINISTRATOR'
      ? 'All service requests'
      : user?.role === 'MAINTENANCE_OFFICER'
        ? 'Assigned to me'
        : 'My requests';

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <p className="text-xs tracking-widest text-gold">REQUESTS</p>
      <div className="mt-1 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl text-navy">{title}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {requests.length} of {requests.length} shown
          </p>
        </div>
        <div className="flex gap-3">
          {user?.role === 'ADMINISTRATOR' && (
            <button
              onClick={handleExport}
              className="rounded border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium hover:border-gold"
            >
              ⭳ Export CSV
            </button>
          )}
          {user?.role === 'STUDENT_STAFF' && (
            <Link
              href="/requests/new"
              className="rounded bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-light"
            >
              New request
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 flex gap-3 rounded-lg border border-neutral-200 bg-white p-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code, title, location, name…"
          className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm focus:border-gold focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as RequestStatus | '')}
          className="rounded border border-neutral-300 px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs tracking-widest text-neutral-500">
            <tr>
              <th className="px-6 py-3">Code</th>
              <th className="px-6 py-3">Request</th>
              <th className="px-6 py-3">Priority</th>
              <th className="px-6 py-3">Assigned</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center">
                  <Spinner className="mx-auto h-6 w-6" />
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-neutral-500">
                  No requests found.
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                  onClick={() => (window.location.href = `/requests/${r.id}`)}
                >
                  <td className="px-6 py-4 text-neutral-500">{r.code}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-navy">{r.title}</div>
                    <div className="text-neutral-500">
                      {r.category} · {r.location}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <PriorityBadge priority={r.priority} />
                  </td>
                  <td className="px-6 py-4 text-neutral-600">
                    {r.assignedTo?.name ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RequestsPage() {
  return (
    <RequireAuth>
      <Navbar />
      <RequestsContent />
      <Footer />
    </RequireAuth>
  );
}
