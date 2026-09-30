import { Link } from "react-router-dom";
import {
  ArrowRight,
  CreditCard,
  FileText,
  LineChart,
  BookOpen,
  Landmark,
  ShieldCheck,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { MarketingNav } from "../components/layout/MarketingNav";
import { Footer } from "../components/layout/Footer";
import { Button } from "../components/ui/button";

const features = [
  {
    icon: CreditCard,
    title: "Payments",
    desc: "Accept and send payments across processors with one reconciled ledger.",
  },
  {
    icon: FileText,
    title: "Invoicing",
    desc: "Issue invoices, track status, and get paid faster with automatic reminders.",
  },
  {
    icon: LineChart,
    title: "Analytics",
    desc: "See spend, revenue, and cash-flow forecasts the moment money moves.",
  },
  {
    icon: BookOpen,
    title: "Accounting",
    desc: "Balance sheet, income statement, and cash flow, always up to date.",
  },
  {
    icon: Landmark,
    title: "Credit",
    desc: "Track your credit profile and apply for financing without leaving FinFlow.",
  },
  {
    icon: ShieldCheck,
    title: "Security",
    desc: "SOC 2 controls, encryption in transit and at rest, on every transaction.",
  },
];

const metrics = [
  { value: "$4.2B+", label: "Processed annually" },
  { value: "99.99%", label: "Platform uptime" },
  { value: "12k+", label: "Businesses on FinFlow" },
  { value: "< 2s", label: "Median settlement view" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.4] [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
        <div className="bg-radial-fade pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Now with
              real-time cash-flow forecasting
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Every financial move, in one place.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              FinFlow unifies payments, invoicing, accounting, and analytics so
              finance teams can see and control the whole business in real time.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link to="/register">
                  Get started free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
            <p className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-success" /> No card required
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-success" /> Set up in minutes
              </span>
            </p>
          </div>

          {/* Signature: a live-looking product preview */}
          <div className="animate-fade-up [animation-delay:120ms]">
            <div className="rounded-2xl border border-border bg-card p-2 shadow-2xl shadow-primary/5">
              <div className="rounded-xl bg-sidebar p-5 text-sidebar-foreground">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-sidebar-foreground/60">
                    Total balance
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                    <ArrowUpRight className="h-3 w-3" /> 8.4%
                  </span>
                </div>
                <div className="tabular mt-1 text-3xl font-semibold">
                  $284,920.50
                </div>
                {/* sparkline */}
                <svg
                  viewBox="0 0 320 72"
                  className="mt-4 h-16 w-full"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(243 78% 70% / 0.5)" />
                      <stop offset="100%" stopColor="hsl(243 78% 70% / 0)" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,52 L40,46 L80,54 L120,34 L160,40 L200,24 L240,28 L280,14 L320,18 V72 H0 Z"
                    fill="url(#spark)"
                  />
                  <path
                    d="M0,52 L40,46 L80,54 L120,34 L160,40 L200,24 L240,28 L280,14 L320,18"
                    fill="none"
                    stroke="hsl(243 78% 72%)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="space-y-1 p-3">
                {[
                  {
                    name: "Stripe payout",
                    time: "Today, 09:24",
                    amount: "+$12,400.00",
                    tone: "text-success",
                  },
                  {
                    name: "AWS - invoice #2241",
                    time: "Yesterday",
                    amount: "-$3,180.00",
                    tone: "text-foreground",
                  },
                  {
                    name: "Acme Corp",
                    time: "2 days ago",
                    amount: "+$8,750.00",
                    tone: "text-success",
                  },
                ].map((r) => (
                  <div
                    key={r.name}
                    className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted"
                  >
                    <div>
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.time}
                      </div>
                    </div>
                    <div className={`tabular text-sm font-medium ${r.tone}`}>
                      {r.amount}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6 py-8 text-sm font-semibold tracking-wide text-muted-foreground">
          <span>NORTHWIND</span>
          <span>ACME</span>
          <span>GLOBEX</span>
          <span>UMBRELLA</span>
          <span>INITECH</span>
          <span>HOOLI</span>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">One platform</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Everything finance touches, connected.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Stop stitching together five tools. FinFlow brings the whole money
            stack under one roof, with a shared ledger and a single source of
            truth.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">
                {title}
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section
        id="metrics"
        className="border-y border-border bg-sidebar text-sidebar-foreground"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-16 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label}>
              <div className="tabular font-display text-4xl font-bold">
                {m.value}
              </div>
              <div className="mt-1 text-sm text-sidebar-foreground/60">
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-8 py-16 text-center">
          <div className="bg-radial-fade pointer-events-none absolute inset-0" />
          <h2 className="relative font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Ready to run finance in real time?
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-muted-foreground">
            Create an account and see your numbers come together in minutes.
          </p>
          <div className="relative mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/register">
                Get started free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
