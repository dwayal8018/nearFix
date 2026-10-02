import Link from "next/link";

const categories = [
  { key: "plumbing", label: "Plumbing" },
  { key: "electrical", label: "Electrical" },
  { key: "housekeeping", label: "Housekeeping" },
  { key: "carpentry", label: "Carpentry" },
  { key: "painting", label: "Painting" },
  { key: "appliance_repair", label: "AC & Appliance Repair" },
  { key: "pest_control", label: "Pest Control" },
  { key: "gardening", label: "Gardening" },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-xl font-bold text-brand-dark">NearFix</span>
          <nav className="flex gap-3 text-sm">
            <Link href="/sign-in" className="text-slate-600 hover:text-brand">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Verified local services, near you.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Find trusted plumbers, electricians, housekeepers and more. Every
          provider is verified before they appear. Request a job, chat in-app,
          and hire with confidence.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/register?role=customer"
            className="rounded-md bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark"
          >
            I need a service
          </Link>
          <Link
            href="/register?role=provider"
            className="rounded-md border border-brand px-5 py-2.5 font-medium text-brand hover:bg-brand/5"
          >
            I offer services
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        <h2 className="mb-6 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">
          Services on NearFix
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.map((c) => (
            <div
              key={c.key}
              className="rounded-lg border border-slate-200 bg-white px-4 py-5 text-center text-sm font-medium text-slate-700"
            >
              {c.label}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
