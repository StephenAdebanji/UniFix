import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-white/10 bg-navy px-8 py-4 text-white">
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
        <div className="flex items-center gap-4 text-sm">
          <Link href="/sign-in" className="text-neutral-200 hover:text-gold">
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded bg-gold px-4 py-2 font-medium text-navy hover:bg-gold-light"
          >
            Create account
          </Link>
        </div>
      </header>

      <main className="flex-1 bg-navy px-8 py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-3 text-xs tracking-[0.3em] text-gold">
              — A DIGITAL SERVICE PORTAL
            </p>
            <h1 className="font-serif text-5xl leading-tight">
              Campus maintenance,{" "}
              <span className="text-gold italic">handled with care.</span>
            </h1>
            <p className="mt-6 max-w-md text-neutral-300">
              Replace paper forms, phone calls, and lost WhatsApp messages
              with one accountable place to submit, assign, and resolve every
              facility request on campus.
            </p>
            <div className="mt-8 flex gap-4">
              <Link
                href="/register"
                className="rounded bg-gold px-5 py-3 font-medium text-navy hover:bg-gold-light"
              >
                Get started →
              </Link>
              <Link
                href="/sign-in"
                className="rounded border border-white/30 px-5 py-3 font-medium hover:border-gold hover:text-gold"
              >
                Sign in to portal
              </Link>
            </div>
            <p className="mt-6 text-xs text-neutral-400">
              Demo accounts: admin@uni.edu · officer@uni.edu · student@uni.edu
              (passwords match role)
            </p>
          </div>

          <div className="rounded-lg bg-cream p-6 text-navy shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-gold">▤</span>
                <div>
                  <div className="text-[10px] tracking-widest text-neutral-500">
                    REQUEST ID
                  </div>
                  <div className="font-serif text-xl">REQ-0142</div>
                </div>
              </div>
              <span className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700">
                IN PROGRESS
              </span>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">CATEGORY</dt>
                <dd>Electricity</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">LOCATION</dt>
                <dd>Lecture Theatre 3, Block B</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">REPORTED BY</dt>
                <dd>Y. Boateng · Computer Science</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">ASSIGNED TO</dt>
                <dd>K. Mensah · Electrical</dd>
              </div>
            </dl>
            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-neutral-200 pt-4 text-center">
              <div>
                <div className="font-serif text-2xl">12</div>
                <div className="text-[10px] tracking-widest text-neutral-500">
                  OPEN
                </div>
              </div>
              <div>
                <div className="font-serif text-2xl">7</div>
                <div className="text-[10px] tracking-widest text-neutral-500">
                  IN PROGRESS
                </div>
              </div>
              <div>
                <div className="font-serif text-2xl">48</div>
                <div className="text-[10px] tracking-widest text-neutral-500">
                  RESOLVED / MO
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section className="bg-cream px-8 py-16 text-navy">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs tracking-[0.3em] text-gold">
            THREE ROLES, ONE WORKFLOW
          </p>
          <h2 className="mt-2 font-serif text-4xl">
            Built for every side of the request.
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Student / Staff",
                body: "Submit a fault with photo evidence, track progress, and get status updates without chasing anyone.",
              },
              {
                title: "Maintenance Officer",
                body: "See only what's assigned to you. Update progress, add notes, and mark jobs complete.",
              },
              {
                title: "Administrator",
                body: "Manage users and roles, assign requests, monitor status, and export CSV reports.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-lg border border-neutral-200 bg-white p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded bg-navy text-gold">
                  ●
                </div>
                <h3 className="font-serif text-xl">{card.title}</h3>
                <p className="mt-2 text-sm text-neutral-600">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-200 bg-neutral-50 px-8 py-12 text-navy">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-4">
          {[
            {
              label: "AUTHENTICATION",
              body: "Role-based access with session persistence.",
            },
            { label: "EVIDENCE UPLOADS", body: "Attach a photo to any fault report." },
            {
              label: "SEARCH & FILTER",
              body: "Find any request by status, category, or officer.",
            },
            {
              label: "AUDIT TRAIL",
              body: "Every status change is logged with who and when.",
            },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs tracking-widest text-gold">{item.label}</p>
              <p className="mt-1 text-sm text-neutral-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="flex items-center justify-between bg-navy px-8 py-5 text-xs text-neutral-400">
        <span>© 2026 UniFix — University Maintenance Portal.</span>
        <span>MIT 8333 — Advanced Web Application Development</span>
      </footer>
    </div>
  );
}
