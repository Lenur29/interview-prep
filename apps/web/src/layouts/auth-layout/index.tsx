import { Code } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import { RoutePath } from '@/shared/config/router/constants';

const AuthLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4 md:px-6">
          <Link to={RoutePath.Root} aria-label="Interview Prep">
            <Code size={36} color="blue" />
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
