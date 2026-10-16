import { ArrowRight, BarChart3, CheckCircle2, KanbanSquare, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/misc'
import { useAuth } from '@/context/AuthContext'

const YEAR = new Date().getFullYear()

const features = [
  { icon: KanbanSquare, title: 'A board that actually saves', body: 'Drag tasks between columns or reorder them. Every move is written to the database, so your board looks the same tomorrow.' },
  { icon: BarChart3, title: 'Honest analytics', body: 'Completion, overdue work and progress by project are calculated from your real tasks — never padded with fake activity.' },
  { icon: ShieldCheck, title: 'Private by design', body: 'Secure HttpOnly sessions and server-side ownership checks mean your projects are visible to you and nobody else.' },
]

const steps = [
  ['Create a project', 'Give it a color, a start date and a deadline.'],
  ['Break it into tasks', 'Set priority and due dates, then drop them into To Do.'],
  ['Move work forward', 'Drag cards across the board and watch progress update.'],
]

export function Landing() {
  const { user } = useAuth()
  return (
    <div className="min-h-dvh bg-ivory">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2" aria-label="Account">
          {user ? (
            <Button asChild><Link to="/app">Open workspace</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost"><Link to="/signin">Sign in</Link></Button>
              <Button asChild><Link to="/signup">Get started</Link></Button>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div className="animate-fade-up">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line-strong bg-paper px-3 py-1 text-xs font-medium text-forest-700">
              <span className="h-1.5 w-1.5 rounded-full bg-terracotta-500" aria-hidden /> Project management, without the noise
            </p>
            <h1 className="font-serif text-4xl font-semibold leading-[1.08] text-forest-800 sm:text-5xl lg:text-6xl">
              Calm, clear space for the work that matters.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              SprintSpace brings your projects, deadlines and Kanban boards into one quiet workspace — so you always know what’s next and how far you’ve come.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to={user ? '/app' : '/signup'}>Start your first project <ArrowRight className="h-4 w-4" /></Link></Button>
              {!user && <Button asChild size="lg" variant="outline"><Link to="/signin">I already have an account</Link></Button>}
            </div>
          </div>

          {/* Illustrative board preview (static decoration, clearly not user data). */}
          <div className="relative animate-fade-up [animation-delay:120ms]" aria-hidden>
            <div className="rounded-3xl border border-line bg-paper p-4 shadow-lift">
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className="h-3 w-3 rounded-full bg-terracotta-500" /><span className="h-3 w-3 rounded-full bg-ochre-600/50" /><span className="h-3 w-3 rounded-full bg-sage-400" />
                <span className="ml-2 text-xs font-medium text-ink-muted">Product launch</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['To Do', ['Draft announcement', 'Review pricing page'], 'bg-sage-400'],
                  ['In Progress', ['Build onboarding flow'], 'bg-terracotta-500'],
                  ['Done', ['Set up analytics', 'Write release notes'], 'bg-forest-600'],
                ].map(([label, items, dot]) => (
                  <div key={label as string} className="rounded-xl bg-sage-50 p-2.5">
                    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold"><span className={`h-2 w-2 rounded-full ${dot}`} />{label as string}</p>
                    <div className="space-y-2">
                      {(items as string[]).map((t) => (
                        <div key={t} className="rounded-lg border border-line bg-paper p-2 text-[11px] leading-snug shadow-soft">{t}<div className="mt-1.5 h-1 w-8 rounded-full bg-terracotta-100" /></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 hidden items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 shadow-lift sm:flex">
              <CheckCircle2 className="h-5 w-5 text-forest-600" /><span className="text-xs font-medium">Order saved</span>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-paper py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-2xl font-serif text-3xl font-semibold text-forest-800">Everything you need to ship, nothing you don’t.</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {features.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-2xl border border-line bg-ivory p-6">
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-forest-600 text-white"><Icon className="h-5 w-5" /></span>
                  <h3 className="font-serif text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="font-serif text-3xl font-semibold text-forest-800">How it works</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map(([t, b], i) => (
              <li key={t} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terracotta-100 font-serif font-semibold text-terracotta-700">{i + 1}</span>
                <div><h3 className="font-serif text-lg font-semibold">{t}</h3><p className="mt-1 text-sm text-ink-soft">{b}</p></div>
              </li>
            ))}
          </ol>
          <div className="mt-14 rounded-3xl bg-forest-700 px-6 py-12 text-center text-ivory sm:px-12">
            <h2 className="font-serif text-3xl font-semibold">Ready for a clearer week?</h2>
            <p className="mx-auto mt-2 max-w-md text-forest-100">Create a free account and set up your first project in under a minute.</p>
            <Button asChild size="lg" className="mt-6 bg-ivory text-forest-800 hover:bg-white"><Link to={user ? '/app' : '/signup'}>{user ? 'Open workspace' : 'Create your account'}</Link></Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-xs text-ink-muted">© {YEAR} SprintSpace</footer>
    </div>
  )
}
