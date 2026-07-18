'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { RequireAuth } from '@/components/RequireAuth';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { PublicUser, RoleName } from '@/lib/types';

const ROLE_LABEL: Record<RoleName, string> = {
  STUDENT_STAFF: 'Student / Staff',
  MAINTENANCE_OFFICER: 'Maintenance Officer',
  ADMINISTRATOR: 'Administrator',
};

const ROLE_BADGE: Record<RoleName, string> = {
  STUDENT_STAFF: 'bg-neutral-100 text-neutral-700',
  MAINTENANCE_OFFICER: 'bg-blue-50 text-blue-700',
  ADMINISTRATOR: 'bg-navy text-white',
};

function UsersContent() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.users.list().then(setUsers);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (id: number, role: RoleName) => {
    await api.users.updateRole(id, role);
    load();
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <p className="text-xs tracking-widest text-gold">ADMINISTRATION</p>
      <h1 className="mt-1 font-serif text-4xl text-navy">User management</h1>
      <p className="mt-2 text-neutral-600">
        Promote students to maintenance officers or administrators. Role
        changes take effect on next sign-in.
      </p>

      <div className="mt-8 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs tracking-widest text-neutral-500">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Change role</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-neutral-500">
                  Loading…
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-6 py-4">
                    <div className="font-medium text-navy">{u.name}</div>
                    <div className="text-neutral-500">{u.department ?? '—'}</div>
                  </td>
                  <td className="px-6 py-4 text-neutral-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${ROLE_BADGE[u.role]}`}
                    >
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      disabled={u.id === currentUser?.id}
                      onChange={(e) =>
                        handleRoleChange(u.id, e.target.value as RoleName)
                      }
                      className="rounded border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100 disabled:text-neutral-400"
                    >
                      <option value="STUDENT_STAFF">Student / Staff</option>
                      <option value="MAINTENANCE_OFFICER">
                        Maintenance Officer
                      </option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
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

export default function UsersPage() {
  return (
    <RequireAuth roles={['ADMINISTRATOR']}>
      <Navbar />
      <UsersContent />
    </RequireAuth>
  );
}
