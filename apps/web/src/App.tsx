export function App() {
  return (
    <main className="min-h-screen bg-bg text-text font-sans">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Interview Prep</h1>
        <p className="mt-2 text-text-muted">Frontend skeleton is working.</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
          >
            Primary
          </button>
          <button
            type="button"
            className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition hover:bg-surface-muted"
          >
            Secondary
          </button>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-3">
          <div className="rounded-md border border-border bg-surface px-4 py-3 text-sm">
            <span className="font-medium text-danger">Unknown</span>
            <p className="text-text-subtle">Self-rating preview</p>
          </div>
          <div className="rounded-md border border-border bg-surface px-4 py-3 text-sm">
            <span className="font-medium text-warning">Partial</span>
            <p className="text-text-subtle">Self-rating preview</p>
          </div>
          <div className="rounded-md border border-border bg-surface px-4 py-3 text-sm">
            <span className="font-medium text-success">Known</span>
            <p className="text-text-subtle">Self-rating preview</p>
          </div>
        </div>

        <p className="mt-10 text-xs text-text-subtle">
          Stack: <code className="font-mono">React 19 + Vite 8 + Tailwind v4</code>
        </p>
      </div>
    </main>
  );
}
