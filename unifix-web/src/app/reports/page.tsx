'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { RequireAuth } from '@/components/RequireAuth';
import { Footer } from '@/components/Footer';
import { LoadingScreen } from '@/components/Spinner';
import { api } from '@/lib/api';
import type { ReportsSummary } from '@/lib/types';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
};

function Bar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="w-40 shrink-0 text-sm text-navy">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-neutral-100">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-sm text-navy">{value}</span>
    </div>
  );
}

function ReportsContent() {
  const [summary, setSummary] = useState<ReportsSummary | null>(null);

  useEffect(() => {
    api.reports.summary().then(setSummary);
  }, []);

  const handleExport = async () => {
    const csv = await api.reports.exportCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reports-summary.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!summary) {
    return <LoadingScreen />;
  }

  const statusMax = Math.max(1, ...Object.values(summary.byStatus));
  const categoryMax = Math.max(1, ...Object.values(summary.byCategory));

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-widest text-gold">ADMINISTRATION</p>
          <h1 className="mt-1 font-serif text-4xl text-navy">
            Reports &amp; analytics
          </h1>
          <p className="mt-2 text-neutral-600">
            Snapshot of maintenance activity across campus.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="rounded border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium hover:border-gold"
        >
          ⭳ Export summary
        </button>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <p className="mb-3 text-xs tracking-widest text-gold">BY STATUS</p>
          {Object.entries(summary.byStatus).map(([status, value]) => (
            <Bar
              key={status}
              label={STATUS_LABEL[status] ?? status}
              value={value}
              max={statusMax}
              color="bg-navy"
            />
          ))}
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <p className="mb-3 text-xs tracking-widest text-gold">BY CATEGORY</p>
          {Object.entries(summary.byCategory).map(([category, value]) => (
            <Bar
              key={category}
              label={category}
              value={value}
              max={categoryMax}
              color="bg-gold"
            />
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6">
        <p className="mb-4 text-xs tracking-widest text-gold">
          OFFICER WORKLOAD
        </p>
        <table className="w-full text-left text-sm">
          <thead className="text-xs tracking-widest text-neutral-500">
            <tr>
              <th className="pb-2">OFFICER</th>
              <th className="pb-2 text-right">ASSIGNED</th>
              <th className="pb-2 text-right">RESOLVED</th>
            </tr>
          </thead>
          <tbody>
            {summary.officerWorkload.map((officer) => (
              <tr key={officer.id} className="border-t border-neutral-100">
                <td className="py-3">
                  <div className="font-medium text-navy">{officer.name}</div>
                  <div className="text-neutral-500">
                    {officer.department ?? '—'}
                  </div>
                </td>
                <td className="py-3 text-right font-serif text-lg text-navy">
                  {officer.assigned}
                </td>
                <td className="py-3 text-right font-serif text-lg text-navy">
                  {officer.resolved}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <RequireAuth roles={['ADMINISTRATOR']}>
      <Navbar />
      <ReportsContent />
      <Footer />
    </RequireAuth>
  );
}
