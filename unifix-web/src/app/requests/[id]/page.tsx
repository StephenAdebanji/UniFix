'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { PriorityBadge, StatusBadge } from '@/components/Badge';
import { RequireAuth } from '@/components/RequireAuth';
import { Footer } from '@/components/Footer';
import { LoadingScreen } from '@/components/Spinner';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { PublicUser, RequestDetail, RequestStatus } from '@/lib/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB');
}

function AssignPanel({
  request,
  onAssigned,
}: {
  request: RequestDetail;
  onAssigned: (r: RequestDetail) => void;
}) {
  const [officers, setOfficers] = useState<PublicUser[]>([]);
  const [officerId, setOfficerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.users.list().then((users) =>
      setOfficers(users.filter((u) => u.role === 'MAINTENANCE_OFFICER')),
    );
  }, []);

  const handleAssign = async () => {
    if (!officerId) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await api.requests.assign(request.id, Number(officerId));
      onAssigned(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <p className="text-xs tracking-widest text-gold">ASSIGN OFFICER</p>
      <select
        value={officerId}
        onChange={(e) => setOfficerId(e.target.value)}
        className="mt-3 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
      >
        <option value="">Select an officer</option>
        {officers.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
            {o.department ? ` — ${o.department}` : ''}
          </option>
        ))}
      </select>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={handleAssign}
        disabled={submitting || !officerId}
        className="mt-3 w-full rounded bg-navy py-2.5 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60"
      >
        {submitting ? 'Assigning…' : 'Assign'}
      </button>
    </div>
  );
}

function UpdateStatusPanel({
  request,
  onUpdated,
}: {
  request: RequestDetail;
  onUpdated: (r: RequestDetail) => void;
}) {
  const nextStatus: RequestStatus =
    request.status === 'ASSIGNED' ? 'IN_PROGRESS' : 'RESOLVED';
  const [status, setStatus] = useState<RequestStatus>(nextStatus);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actionLabel =
    status === 'IN_PROGRESS'
      ? 'Mark In Progress'
      : status === 'RESOLVED'
        ? 'Resolve'
        : 'Reject';

  const handleUpdate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await api.requests.updateStatus(
        request.id,
        status,
        note || undefined,
      );
      onUpdated(updated);
      setNote('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <p className="text-xs tracking-widest text-gold">UPDATE STATUS</p>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as RequestStatus)}
        className="mt-3 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
      >
        <option value="IN_PROGRESS">Mark in progress</option>
        <option value="RESOLVED">Resolve</option>
        <option value="REJECTED">Reject</option>
      </select>
      <label className="mt-3 block text-sm font-medium text-navy">
        Note (optional)
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add context for the log…"
        rows={3}
        className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-gold focus:outline-none"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={handleUpdate}
        disabled={submitting}
        className="mt-3 w-full rounded bg-green-700 py-2.5 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
      >
        {submitting ? 'Saving…' : actionLabel}
      </button>
    </div>
  );
}

function RequestDetailContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = () => {
    api.requests
      .get(id)
      .then(setRequest)
      .catch(() => setNotFound(true));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-10 text-center text-neutral-500">
        Request not found, or you don&apos;t have access to it.
      </div>
    );
  }

  if (!request) {
    return <LoadingScreen />;
  }

  const officerCanAct =
    user?.role === 'MAINTENANCE_OFFICER' &&
    request.assignedTo?.id === user.id &&
    (request.status === 'ASSIGNED' || request.status === 'IN_PROGRESS');

  const adminCanAssign = user?.role === 'ADMINISTRATOR';

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <button
        onClick={() => router.push('/requests')}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-navy hover:text-gold"
      >
        ← Back to requests
      </button>

      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-500">{request.code}</span>
        <StatusBadge status={request.status} />
        <PriorityBadge priority={request.priority} />
      </div>
      <h1 className="mt-2 font-serif text-4xl text-navy">{request.title}</h1>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-xs tracking-widest text-neutral-500">
                  CATEGORY
                </p>
                <p className="mt-1 font-medium text-navy">{request.category}</p>
              </div>
              <div>
                <p className="text-xs tracking-widest text-neutral-500">
                  LOCATION
                </p>
                <p className="mt-1 font-medium text-navy">{request.location}</p>
              </div>
              <div>
                <p className="text-xs tracking-widest text-neutral-500">
                  REPORTED BY
                </p>
                <p className="mt-1 font-medium text-navy">
                  {request.submittedBy.name}
                </p>
              </div>
              <div>
                <p className="text-xs tracking-widest text-neutral-500">
                  ASSIGNED TO
                </p>
                <p className="mt-1 font-medium text-navy">
                  {request.assignedTo?.name ?? 'Not yet assigned'}
                </p>
              </div>
            </div>
            <div className="mt-6 border-t border-neutral-200 pt-6">
              <p className="text-xs tracking-widest text-neutral-500">
                DESCRIPTION
              </p>
              <p className="mt-1 text-navy">{request.description}</p>
              {request.evidenceFileUrl && (
                <a
                  href={request.evidenceFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm text-blue-700 underline"
                >
                  View attached photo
                </a>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <p className="mb-4 text-xs tracking-widest text-gold">
              ACTIVITY LOG
            </p>
            <div className="space-y-4">
              {(request.activity ?? []).map((event, i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-gold" />
                  <div>
                    <p className="font-medium text-navy">{event.label}</p>
                    {event.note && (
                      <p className="text-sm italic text-neutral-500">
                        &quot;{event.note}&quot;
                      </p>
                    )}
                    <p className="text-xs text-neutral-500">
                      🕐 {formatDate(event.at)} · {event.by}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {officerCanAct && (
            <UpdateStatusPanel request={request} onUpdated={setRequest} />
          )}
          {adminCanAssign && !request.assignedTo && (
            <AssignPanel request={request} onAssigned={setRequest} />
          )}

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6">
            <p className="text-xs tracking-widest text-gold">TIMESTAMPS</p>
            <p className="mt-2 text-sm text-navy">
              Created: {formatDate(request.createdAt)}
            </p>
            <p className="text-sm text-navy">
              Updated: {formatDate(request.updatedAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RequestDetailPage() {
  return (
    <RequireAuth>
      <Navbar />
      <RequestDetailContent />
      <Footer />
    </RequireAuth>
  );
}
