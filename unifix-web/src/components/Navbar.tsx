'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const ROLE_LABEL: Record<string, string> = {
  STUDENT_STAFF: 'Student / Staff',
  MAINTENANCE_OFFICER: 'Maintenance Officer',
  ADMINISTRATOR: 'Administrator',
};

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  const links: { href: string; label: string }[] = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/requests', label: 'Requests' },
  ];
  if (user.role === 'STUDENT_STAFF') {
    links.push({ href: '/requests/new', label: 'New Request' });
  }
  if (user.role === 'ADMINISTRATOR') {
    links.push({ href: '/users', label: 'Users' });
    links.push({ href: '/reports', label: 'Reports' });
  }

  const handleLogout = async () => {
    await logout();
    router.replace('/sign-in');
  };

  return (
    <nav className="flex items-center justify-between bg-navy px-8 py-4 text-white">
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

      <div className="flex items-center gap-6 text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              pathname === link.href
                ? 'text-gold'
                : 'text-neutral-200 hover:text-gold'
            }
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right leading-tight">
          <div className="text-sm">{user.name}</div>
          <div className="text-[10px] tracking-widest text-gold">
            {ROLE_LABEL[user.role]}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-neutral-200 hover:text-gold"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
