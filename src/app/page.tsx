import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <section className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-20 pt-12">
        <header className="flex flex-wrap items-center justify-between gap-6 text-sm text-[var(--muted)]">
          <div className="flex items-center gap-3 text-[var(--ink)]">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-sm font-semibold">
              W
            </span>
            <span className="font-semibold">Whiteborad</span>
          </div>
          <nav className="flex items-center gap-4">
            <span>Realtime</span>
            <span>Teams</span>
            <span>Export</span>
          </nav>
        </header>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              A calm workspace for teams to map ideas fast.
            </h1>
            <p className="text-lg text-[var(--muted)]">
              Create a shared board, invite teammates, and sketch without
              clutter. Minimal tools, maximal clarity.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-[var(--bg)]"
              >
                Start
              </Link>
              <Link
                href="/workspace/demo"
                className="rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--ink)]"
              >
                View demo
              </Link>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)]">
              <span>Google login</span>
              <span>Email invites</span>
              <span>Realtime sync</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow)]">
            <div className="grid grid-cols-[140px_1fr] gap-4">
              <div className="rounded-xl bg-[var(--bg-strong)] p-4 text-sm text-[var(--muted)]">
                <p className="font-semibold text-[var(--ink)]">New project</p>
                <div className="mt-6 space-y-3">
                  <div className="h-2 w-24 rounded-full bg-[var(--border)]" />
                  <div className="h-2 w-20 rounded-full bg-[var(--border)]" />
                  <div className="h-2 w-16 rounded-full bg-[var(--border)]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-[var(--bg-strong)] p-4">
                  <p className="text-xs text-[var(--muted)]">Project 01</p>
                  <div className="mt-6 flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-[#8fb5ff]" />
                    <span className="h-6 w-6 rounded-full bg-[#ffd3a4]" />
                    <span className="h-6 w-6 rounded-full bg-[#d1d5db]" />
                  </div>
                </div>
                <div className="rounded-xl bg-[var(--bg-strong)] p-4">
                  <p className="text-xs text-[var(--muted)]">Project 02</p>
                </div>
                <div className="rounded-xl bg-[var(--bg-strong)] p-4" />
                <div className="rounded-xl bg-[var(--bg-strong)] p-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-20 lg:grid-cols-3">
        {[
          {
            title: 'Invite the crew',
            desc: 'Add teammates by email or start solo. You can switch anytime.',
          },
          {
            title: 'Plan by frames',
            desc: 'Drop frames, connect arrows, and build a narrative in minutes.',
          },
          {
            title: 'Sketch ideas fast',
            desc: 'Draw with pen, drop sticky notes, and export when ready.',
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-[var(--border)] bg-white p-6"
          >
            <h2 className="text-lg font-semibold">{card.title}</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">{card.desc}</p>
          </div>
        ))}
      </section>
    </main>
  )
}
