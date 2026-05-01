import { Menu } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router';

import { RoutePath } from '@/shared/config/router/constants';
import LemurLogo from '@/shared/ui/lemur-logo';

const navItems = [
  { to: RoutePath.Dashboard, label: 'Dashboard' },
  { to: RoutePath.Topics, label: 'Topics' },
  { to: RoutePath.Review, label: 'Review' },
  { to: RoutePath.Notes, label: 'Notes' },
];

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 md:px-6">
          <Link to={RoutePath.Dashboard} aria-label="Lemur">
            <LemurLogo size={80} />
          </Link>

          <nav className="hidden items-center gap-5 text-sm text-text-muted md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? 'text-text' : 'transition hover:text-text'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to={RoutePath.Account}
              className="hidden text-sm text-text-muted transition hover:text-text md:inline"
            >
              Account
            </Link>

            <button
              type="button"
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-text-muted transition hover:text-text md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 md:px-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
