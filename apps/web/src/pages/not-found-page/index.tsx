import { Link } from 'react-router';

const NotFoundPage = () => {
  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-3xl font-semibold">404</h1>
      <p className="mt-2 text-text-muted">Page not found.</p>
      <Link to="/" className="mt-4 inline-block text-accent hover:underline">
        Go home
      </Link>
    </div>
  );
};

export default NotFoundPage;
