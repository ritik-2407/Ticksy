/**
 * Seed content for the public /demo: a made-up product team mid-sprint.
 *
 * Chosen so the board shows the product's interesting behaviour at a glance:
 *   - every column has cards, and every priority appears
 *   - some tickets are assigned to the visitor, some to teammates, some to
 *     nobody. Switching the demo role to MEMBER locks the teammates' cards.
 *   - a couple of comment threads, one with a comment the visitor can edit
 *
 * All names are fictional. Times are offsets from "now", resolved by
 * createDemoStore, so the data never looks stale.
 */

import type { TicketCard } from "@/lib/ticket";

/** The visitor. */
export const DEMO_USER = { id: "demo-user-you", name: "Jordan Lee" } as const;

export const DEMO_WORKSPACE = { name: "Orbit Mobile", slug: "demo" } as const;

export const DEMO_MEMBERS = [
  DEMO_USER,
  { id: "demo-user-maya", name: "Maya Chen" },
  { id: "demo-user-dev", name: "Dev Patel" },
  { id: "demo-user-sara", name: "Sara Okafor" },
] as const;

export const DEMO_LABELS = [
  { id: "demo-label-bug", name: "bug", color: "#ef4444" },
  { id: "demo-label-feature", name: "feature", color: "#3b82f6" },
  { id: "demo-label-design", name: "design", color: "#8b5cf6" },
  { id: "demo-label-docs", name: "docs", color: "#10b981" },
] as const;

type SeedTicket = {
  id: string;
  title: string;
  description: string;
  status: TicketCard["status"];
  priority: TicketCard["priority"];
  assigneeId: string | null;
  createdById: string;
  labelIds: string[];
  daysAgo: number;
  updatedMinutesAgo: number;
};

export const DEMO_TICKETS: SeedTicket[] = [
  {
    id: "demo-ticket-1",
    title: "Crash when uploading a photo over 10 MB",
    description:
      "The app closes without an error on Android when the picked photo is larger than 10 MB. Reproduced on two devices. We should resize before upload or show a clear limit message.",
    status: "OPEN",
    priority: "HIGH",
    assigneeId: null,
    createdById: "demo-user-sara",
    labelIds: ["demo-label-bug"],
    daysAgo: 1,
    updatedMinutesAgo: 90,
  },
  {
    id: "demo-ticket-2",
    title: "Dark mode for the onboarding screens",
    description:
      "The first-run screens ignore the system theme and flash white at night. Reuse the tokens from the settings screen.",
    status: "OPEN",
    priority: "LOW",
    assigneeId: null,
    createdById: "demo-user-maya",
    labelIds: ["demo-label-feature", "demo-label-design"],
    daysAgo: 3,
    updatedMinutesAgo: 300,
  },
  {
    id: "demo-ticket-3",
    title: "Draft release notes for v2.4",
    description:
      "Summarise the sprint for the changelog. Keep it to five bullets and link the two fixes customers asked about.",
    status: "OPEN",
    priority: "MEDIUM",
    assigneeId: DEMO_USER.id,
    createdById: DEMO_USER.id,
    labelIds: ["demo-label-docs"],
    daysAgo: 2,
    updatedMinutesAgo: 600,
  },
  {
    id: "demo-ticket-4",
    title: "Fix login redirect loop on Safari",
    description:
      "After signing in on Safari 17 the page bounces between /login and /home. Cookies are set, so it looks like the SameSite attribute on the session cookie.",
    status: "IN_PROGRESS",
    priority: "CRITICAL",
    assigneeId: "demo-user-maya",
    createdById: "demo-user-dev",
    labelIds: ["demo-label-bug"],
    daysAgo: 4,
    updatedMinutesAgo: 45,
  },
  {
    id: "demo-ticket-5",
    title: "Quick search with a keyboard shortcut",
    description:
      "Open search from anywhere with Cmd+K / Ctrl+K. Arrow keys move through results, Enter opens one, Escape closes.",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    assigneeId: DEMO_USER.id,
    createdById: "demo-user-maya",
    labelIds: ["demo-label-feature"],
    daysAgo: 5,
    updatedMinutesAgo: 200,
  },
  {
    id: "demo-ticket-6",
    title: "Move notification emails to the new template",
    description:
      "Swap the three legacy email templates for the new layout and check them in Gmail, Outlook and Apple Mail.",
    status: "IN_REVIEW",
    priority: "HIGH",
    assigneeId: "demo-user-dev",
    createdById: DEMO_USER.id,
    labelIds: ["demo-label-feature", "demo-label-design"],
    daysAgo: 6,
    updatedMinutesAgo: 120,
  },
  {
    id: "demo-ticket-7",
    title: "Rate-limit the public share link endpoint",
    description:
      "Anyone can hit /share/:id as fast as they like. Add a per-IP limit and return 429 with a Retry-After header.",
    status: "IN_REVIEW",
    priority: "HIGH",
    assigneeId: "demo-user-sara",
    createdById: "demo-user-dev",
    labelIds: ["demo-label-bug"],
    daysAgo: 7,
    updatedMinutesAgo: 400,
  },
  {
    id: "demo-ticket-8",
    title: "Set up error monitoring",
    description:
      "Wire up crash reporting for iOS and Android, tagged by app version, with alerts to the team channel.",
    status: "DONE",
    priority: "MEDIUM",
    assigneeId: "demo-user-sara",
    createdById: DEMO_USER.id,
    labelIds: ["demo-label-feature"],
    daysAgo: 10,
    updatedMinutesAgo: 1500,
  },
  {
    id: "demo-ticket-9",
    title: "Rewrite onboarding copy",
    description: "Shorter sentences and one action per screen. Approved by design.",
    status: "DONE",
    priority: "LOW",
    assigneeId: "demo-user-maya",
    createdById: "demo-user-maya",
    labelIds: ["demo-label-design", "demo-label-docs"],
    daysAgo: 9,
    updatedMinutesAgo: 2600,
  },
  {
    id: "demo-ticket-10",
    title: "Fix typo on the pricing page",
    description: '"Recieve" is back in the footer.',
    status: "DONE",
    priority: "LOW",
    assigneeId: "demo-user-dev",
    createdById: DEMO_USER.id,
    labelIds: ["demo-label-bug"],
    daysAgo: 8,
    updatedMinutesAgo: 3100,
  },
];

type SeedComment = {
  id: string;
  ticketId: string;
  body: string;
  minutesAgo: number;
  author: { id: string; name: string };
};

export const DEMO_COMMENTS: SeedComment[] = [
  {
    id: "demo-comment-1",
    ticketId: "demo-ticket-4",
    body: "Confirmed on Safari 17.2. Chrome and Firefox are fine, so it is the cookie attributes.",
    minutesAgo: 240,
    author: { id: "demo-user-dev", name: "Dev Patel" },
  },
  {
    id: "demo-comment-2",
    ticketId: "demo-ticket-4",
    body: "I think SameSite=None without Secure on the staging domain is the culprit. Trying a fix now.",
    minutesAgo: 70,
    author: { id: "demo-user-maya", name: "Maya Chen" },
  },
  {
    id: "demo-comment-3",
    ticketId: "demo-ticket-5",
    body: "Started with the modal and focus trap. Results list is next.",
    minutesAgo: 180,
    author: { id: DEMO_USER.id, name: DEMO_USER.name },
  },
  {
    id: "demo-comment-4",
    ticketId: "demo-ticket-6",
    body: "Gmail and Apple Mail look right. Outlook is stripping the button padding, can someone take a look?",
    minutesAgo: 130,
    author: { id: "demo-user-dev", name: "Dev Patel" },
  },
];
