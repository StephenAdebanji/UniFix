'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { PriorityBadge, StatusBadge } from '@/components/Badge';
import { RequireAuth } from '@/components/RequireAuth';
import { Footer } from '@/components/Footer';
import { LoadingScreen, Spinner } from '@/components/Spinner';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  ALLOWED_TRANSITIONS,
  isTerminal,
  STATUS_ACTION_LABEL,
} from '@/lib/status-transitions';
import type { PublicUser, RequestDetail, RequestStatus } from '@/lib/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB');
}

const ACTION_BUTTON_STYLE: Partial<Record<RequestStatus, string>> = {
  ACCEPTED: 'bg-navy hover:bg-navy-light',
  IN_PROGRESS: 'bg-navy hover:bg-navy-light',
  RESOLVED: 'bg-green-700 hover:bg-green-800',
  REJECTED: 'bg-red-700 hover:bg-red-800',
};

function AssignPanel({
  request,
  onAssigned,
  onConflict,
}: {
  request: RequestDetail;
  onAssigned: (r: RequestDetail) => void;
  onConflict: () => void;
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
      if (err instanceof ApiError && (err.status === 400 || err.status === 409)) {
        onConflict();
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong');
      }
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
        disabled={submitting}
        className="mt-3 w-full rounded border border-neutral-300 px-3 py-2 text-sm disabled:opacity-60"
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
        className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-navy py-2.5 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60"
      >
        {submitting && <Spinner className="h-4 w-4 text-white" />}
        {submitting ? 'Assigning…' : 'Assign'}
      </button>
    </div>
  );
}

function UpdateStatusPanel({
  request,
  onUpdated,
  onConflict,
}: {
  request: RequestDetail;
  onUpdated: (r: RequestDetail) => void;
  onConflict: () => void;
}) {
  const [note, setNote] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState<RequestStatus | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const actions = ALLOWED_TRANSITIONS[request.status];

  const handleAction = async (target: RequestStatus) => {
    if (target === 'REJECTED' && !note.trim()) {
      setError('A reason is required to reject a request');
      return;
    }
    setSubmittingStatus(target);
    setError(null);
    try {
      const updated = await api.requests.updateStatus(
        request.id,
        target,
        note || undefined,
      );
      onUpdated(updated);
      setNote('');
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 409)) {
        onConflict();
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong');
      }
    } finally {
      setSubmittingStatus(null);
    }
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <p className="text-xs tracking-widest text-gold">UPDATE STATUS</p>
      <label className="mt-3 block text-sm font-medium text-navy">
        {actions.includes('REJECTED') ? 'Note (required to reject)' : 'Note (optional)'}
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={submittingStatus !== null}
        placeholder="Add context for the log…"
        rows={3}
        className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-gold focus:outline-none disabled:opacity-60"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 space-y-2">
        {actions.map((target) => (
          <button
            key={target}
            onClick={() => handleAction(target)}
            disabled={submittingStatus !== null}
            className={`flex w-full items-center justify-center gap-2 rounded py-2.5 text-sm font-medium text-white disabled:opacity-60 ${ACTION_BUTTON_STYLE[target] ?? 'bg-navy hover:bg-navy-light'}`}
          >
            {submittingStatus === target && (
              <Spinner className="h-4 w-4 text-white" />
            )}
            {submittingStatus === target
              ? 'Saving…'
              : STATUS_ACTION_LABEL[target]}
          </button>
        ))}
      </div>
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
  const [banner, setBanner] = useState<string | null>(null);

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

  const handleConflict = () => {
    setBanner('This request was already updated — showing the latest state.');
    load();
  };

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
    !isTerminal(request.status);

  const adminCanAssign = user?.role === 'ADMINISTRATOR';

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <button
        onClick={() => router.push('/requests')}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-navy hover:text-gold"
      >
        ← Back to requests
      </button>

      {banner && (
        <div className="mb-6 flex items-center justify-between rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>{banner}</span>
          <button
            onClick={() => setBanner(null)}
            className="ml-4 text-amber-700 hover:text-amber-900"
          >
            ✕
          </button>
        </div>
      )}

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
            <UpdateStatusPanel
              request={request}
              onUpdated={setRequest}
              onConflict={handleConflict}
            />
          )}
          {adminCanAssign && !request.assignedTo && (
            <AssignPanel
              request={request}
              onAssigned={setRequest}
              onConflict={handleConflict}
            />
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
