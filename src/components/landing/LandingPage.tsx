"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

// ─── SVG Icon components ────────────────────────────────────────────────────
function KanbanIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v11" />
    </svg>
  );
}
function WorkspaceIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function PriorityIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function LabelIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}
function TeamIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function DragIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="5 9 2 12 5 15" />
      <polyline points="9 5 12 2 15 5" />
      <polyline points="15 19 12 22 9 19" />
      <polyline points="19 9 22 12 19 15" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="12" y1="2" x2="12" y2="22" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ─── Data ────────────────────────────────────────────────────────────────────
const FEATURES = [
  { Icon: KanbanIcon,    title: "4-Column Kanban",         iconColor: "text-stone-500 dark:text-stone-400" },
  { Icon: WorkspaceIcon, title: "Multi-tenant Workspaces", iconColor: "text-stone-500 dark:text-stone-400" },
  { Icon: PriorityIcon,  title: "Smart Prioritization",    iconColor: "text-stone-500 dark:text-stone-400" },
  { Icon: LabelIcon,     title: "Workspace Labels",        iconColor: "text-stone-500 dark:text-stone-400" },
  { Icon: TeamIcon,      title: "Role-based Access",       iconColor: "text-stone-500 dark:text-stone-400" },
  { Icon: CommentIcon,   title: "Threaded Comments",       iconColor: "text-stone-500 dark:text-stone-400" },
  { Icon: DragIcon,      title: "Drag & Drop",             iconColor: "text-stone-500 dark:text-stone-400" },
  { Icon: ShieldIcon,    title: "Tenant Isolation",        iconColor: "text-stone-500 dark:text-stone-400" },
];

const MOCK_COLUMNS = [
  {
    id: "OPEN",
    title: "Open",
    dot: "bg-gray-400",
    count: 3,
    tickets: [
      { id: "240", title: "Design new onboarding flow", label: "feature", priority: "HIGH", assignee: "AL" },
      { id: "428", title: "Fix auth redirect loop", label: "bug", priority: "CRITICAL", assignee: "RK" },
      { id: "512", title: "Update API docs", label: "docs", priority: "LOW", assignee: "SK" },
    ],
  },
  {
    id: "IN_PROGRESS",
    title: "In Progress",
    dot: "bg-blue-400",
    count: 2,
    tickets: [
      { id: "631", title: "Drag & drop kanban board", label: "feature", priority: "HIGH", assignee: "SK" },
      { id: "187", title: "Email notification system", label: "enhancement", priority: "MEDIUM", assignee: "AL" },
    ],
  },
  {
    id: "IN_REVIEW",
    title: "In Review",
    dot: "bg-amber-400",
    count: 2,
    tickets: [
      { id: "903", title: "Workspace settings page", label: "feature", priority: "MEDIUM", assignee: "RK" },
      { id: "356", title: "Mobile responsive layout", label: "enhancement", priority: "HIGH", assignee: "AL" },
    ],
  },
  {
    id: "DONE",
    title: "Done",
    dot: "bg-emerald-400",
    count: 2,
    tickets: [
      { id: "774", title: "Google OAuth integration", label: "feature", priority: "HIGH", assignee: "SK" },
      { id: "219", title: "Initial schema design", label: "docs", priority: "LOW", assignee: "AL" },
    ],
  },
];

// Muted monotone priority badges — no vivid hues, just weight through shade
const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-stone-200/80 text-stone-600 dark:bg-white/10 dark:text-stone-300 font-semibold",
  HIGH:     "bg-stone-200/60 text-stone-500 dark:bg-white/[0.07] dark:text-stone-400",
  MEDIUM:   "bg-stone-100    text-stone-400 dark:bg-white/[0.05] dark:text-stone-500",
  LOW:      "bg-stone-100/60 text-stone-300 dark:bg-white/[0.03] dark:text-stone-600",
};

const STEPS = [
  {
    num: "01",
    title: "Sign in with Google",
    description:
      "One click and you are in. No passwords to manage, no email confirmation hoops to jump through.",
  },
  {
    num: "02",
    title: "Create a workspace",
    description:
      "Name your team's space. Ticksy generates a URL slug instantly — share it with teammates to invite them.",
  },
  {
    num: "03",
    title: "File & track tickets",
    description:
      "Add tickets, set priorities, attach labels, assign teammates, and move cards across the board as work progresses.",
  },
];


// ─── Background blobs ────────────────────────────────────────────────────────
function BackgroundBlobs() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* Top-left — deep orange */}
      <div className="landing-blob absolute -top-48 -left-24 h-[600px] w-[600px] rounded-full bg-orange-200/45 dark:bg-orange-900/25 blur-3xl" style={{ animationDelay: "0s" }} />
      {/* Top-right — warm amber */}
      <div className="landing-blob absolute -top-32 right-0 h-[500px] w-[500px] rounded-full bg-amber-200/40 dark:bg-amber-900/20 blur-3xl" style={{ animationDelay: "2s" }} />
      {/* Center — soft peach */}
      <div className="landing-blob absolute top-1/2 left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-orange-100/35 dark:bg-orange-950/25 blur-3xl" style={{ animationDelay: "4s" }} />
      {/* Bottom-left — burnt sienna */}
      <div className="landing-blob absolute bottom-0 -left-32 h-[500px] w-[500px] rounded-full bg-red-100/25 dark:bg-red-950/15 blur-3xl" style={{ animationDelay: "1s" }} />
      {/* Bottom-right — golden amber */}
      <div className="landing-blob absolute -bottom-24 right-0 h-[400px] w-[400px] rounded-full bg-amber-200/35 dark:bg-amber-900/20 blur-3xl" style={{ animationDelay: "3s" }} />
    </div>
  );
}

// ─── Navigation ──────────────────────────────────────────────────────────────
function LandingNav() {
  return (
    <header className="glass-header sticky top-0 z-50">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-600 dark:bg-orange-500 shadow-sm">
            <span className="text-[11px] font-bold text-white">T</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            Ticksy
          </span>
        </div>

        {/* Center links */}
        <div className="hidden items-center gap-6 md:flex">
          <a href="#features" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-150">
            Features
          </a>
          <a href="#board" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-150">
            Product
          </a>
          <a href="#how-it-works" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-150">
            How it works
          </a>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/sign-in"
            className="btn-primary !py-1.5 !px-4 !text-xs"
          >
            Sign in
          </Link>
        </div>
      </nav>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-16 pt-24 text-center">
      

      {/* Main headline */}
      <h1 className="landing-fade-in mt-6 text-5xl font-semibold tracking-tight text-gray-900 dark:text-gray-50 sm:text-6xl lg:text-7xl" style={{ animationDelay: "60ms" }}>
        The board your team{" "}
        <br className="hidden sm:block" />
        <span className="landing-gradient-text">actually wants</span>{" "}
        to use.
      </h1>

      {/* CTAs */}
      <div className="landing-fade-in mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "180ms" }}>
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 dark:bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition-all duration-150 hover:-translate-y-0.5"
        >
          <GoogleIcon />
          Continue with Google
        </Link>
        <a
          href="#board"
          className="inline-flex items-center gap-1.5 rounded-xl border border-black/[0.1] dark:border-white/10 bg-[#faf7f2]/70 dark:bg-white/5 backdrop-blur-sm px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-[#faf7f2]/90 dark:hover:bg-white/10 transition-all duration-150"
        >
          See the board <ArrowRightIcon />
        </a>
      </div>

    </section>
  );
}

// ─── Features ────────────────────────────────────────────────────────────────
function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      {/* Section heading */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
          Everything your team needs.{" "}
        </h2>
      </div>

      {/* Feature grid */}
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ Icon, title, iconColor }) => (
          <div
            key={title}
            className={`glass group relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]`}
          >
            {/* Monotone hover wash */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/[0.03] to-transparent dark:from-white/[0.03] dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className={`relative mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-black/[0.04] dark:bg-white/[0.06] ${iconColor}`}>
              <Icon />
            </div>
            <h3 className="relative text-sm font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Kanban board preview (full-width) ───────────────────────────────────────
function KanbanPreview() {
  return (
    <section id="board" className="relative py-24 overflow-hidden">
      {/* Section glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent" />

      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
            Four columns. Infinite clarity.
          </h2>
        </div>

        <div className="mt-14 glass overflow-hidden rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.10)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
          {/* App bar */}
          <div className="flex items-center gap-3 border-b border-black/[0.07] dark:border-white/[0.07] bg-white/40 dark:bg-white/[0.025] px-6 py-3.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-600 dark:bg-orange-500">
              <span className="text-[9px] font-bold text-white">T</span>
            </div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Acme Corp</span>
            <span className="ml-auto text-xs text-gray-400 dark:text-gray-600">4 members · 9 tickets</span>
          </div>

          {/* Columns */}
          <div className="grid grid-cols-4 gap-0 divide-x divide-black/[0.05] dark:divide-white/[0.05]">
            {MOCK_COLUMNS.map((col) => (
              <div key={col.id} className="flex flex-col gap-3 p-4">
                {/* Column header */}
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {col.title}
                  </span>
                  <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-100 dark:bg-white/8 px-1 text-[9px] font-semibold text-gray-500 dark:text-gray-500">
                    {col.count}
                  </span>
                </div>

                {/* Tickets */}
                {col.tickets.map((ticket, i) => (
                  <div
                    key={i}
                    className="group/card rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-[#fdf9f4]/90 dark:bg-white/[0.04] p-3 shadow-sm backdrop-blur-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md cursor-grab"
                  >
                    <p className="text-xs font-medium leading-snug text-gray-800 dark:text-gray-200">
                      {ticket.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {/* Monotone label pill — no color, clean neutral */}
                      <span className="rounded-md border border-black/[0.07] dark:border-white/[0.08] bg-black/[0.04] dark:bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-stone-400 dark:text-stone-500">
                        {ticket.label}
                      </span>
                      <span className={`ml-auto rounded-md px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${PRIORITY_BADGE[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[9px] text-gray-300 dark:text-gray-700">#TKY-{ticket.id}</span>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 dark:bg-white/10 text-[9px] font-bold text-gray-600 dark:text-gray-300">
                        {ticket.assignee}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Add ticket ghost */}
                <button className="flex items-center gap-1.5 rounded-xl border border-dashed border-gray-200 dark:border-white/[0.06] p-2.5 text-[11px] text-gray-400 dark:text-gray-600 hover:border-gray-300 dark:hover:border-white/10 hover:text-gray-500 transition-colors duration-150">
                  <span className="text-base leading-none">+</span> New ticket
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorksSection() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
          Simplest Workflow.
        </h2>
      </div>

      <div className="relative mt-14">
        {/* Connecting line */}
        <div className="pointer-events-none absolute left-1/2 top-10 hidden h-[calc(100%-5rem)] w-px -translate-x-1/2 bg-gradient-to-b from-gray-200 via-gray-100 to-transparent dark:from-white/10 dark:via-white/5 lg:block" />

        <div className="grid gap-6 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={i} className="glass group relative overflow-hidden rounded-2xl p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
              {/* Step number */}
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900/5 dark:bg-white/6 font-mono text-lg font-bold text-gray-300 dark:text-gray-700 transition-colors group-hover:text-gray-400 dark:group-hover:text-gray-600">
                {step.num}
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


// ─── Final CTA ────────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="glass relative overflow-hidden rounded-3xl px-8 py-16 text-center shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        {/* Decorative gradients inside card */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-orange-300/20 dark:bg-orange-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-0 h-48 w-64 rounded-full bg-amber-300/20 dark:bg-amber-600/10 blur-3xl" />

        <h2 className="relative text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
          Stop losing track of work.
          <br />
          <span className="landing-gradient-text">Start shipping it.</span>
        </h2>

        <div className="relative mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 dark:bg-orange-500 px-7 py-3.5 text-sm font-semibold text-white shadow-xl hover:bg-orange-700 dark:hover:bg-orange-600 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-2xl"
          >
            <GoogleIcon />
            Sign in for free
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-orange-100/80 dark:border-white/[0.06] bg-[#faf7f2]/60 dark:bg-white/[0.01]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-600 dark:bg-orange-500">
              <span className="text-[9px] font-bold text-white">T</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ticksy</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-5">
            <a href="#features" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Features</a>
            <a href="#board" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Product</a>
            <a href="#how-it-works" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">How it works</a>
            <Link href="/sign-in" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Sign in</Link>
          </div>

          {/* Copyright */}
          <p className="text-xs text-gray-300 dark:text-gray-700">
            © {new Date().getFullYear()} Ticksy
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#faf7f2] dark:bg-zinc-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <BackgroundBlobs />
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <KanbanPreview />
      <HowItWorksSection />
      <CTASection />
      <Footer />
    </div>
  );
}
