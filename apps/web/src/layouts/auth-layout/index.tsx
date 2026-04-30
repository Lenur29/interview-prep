import { Link, Outlet } from 'react-router';

import { RoutePath } from '@/shared/config/router/constants';
import LemurLogo from '@/shared/ui/lemur-logo';

const AuthLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center px-4 md:px-6">
          <Link to={RoutePath.Root} aria-label="Lemur">
            <LemurLogo size={80} />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 md:px-6 md:py-12">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;
