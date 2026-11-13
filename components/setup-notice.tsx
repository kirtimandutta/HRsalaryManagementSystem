export function SetupNotice() {
  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-line bg-card p-5 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Database</p>
      <h1 className="mt-2 font-display text-2xl font-medium sm:text-3xl">The compensation database is not ready</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Create the SQLite file and load 10,000 employees from the project root, then refresh this page.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-xl bg-stone-900 px-4 py-3 text-sm text-stone-100">
        npm run db:setup
      </pre>
    </section>
  );
}
