/**
 * prisma/seed.ts
 *
 * Populates the database with realistic demo data so every feature has
 * something to render during development. Run with:
 *   npm run db:seed
 *
 * What gets created:
 *   - 2 workspaces  (Acme Corp, Nova Labs)
 *   - 4 users       (alice=admin@acme, bob=member@acme, carol=admin@nova, dave=member@nova)
 *   - 4 memberships (alice+bob → acme, carol+dave → nova — fully isolated)
 *   - 6 labels      (3 per workspace, different colors)
 *   - 8 tickets     (4 per workspace, mixed statuses + priorities)
 *   - 4 comments    (2 per workspace — one on each "in-progress" ticket)
 */

import "dotenv/config"; // must be first — loads .env before anything reads process.env
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
// In Prisma 7+ enums are plain const objects, not TS enums.
// Import them from the generated namespace so TypeScript knows their literal types.
import { $Enums } from "@prisma/client";

const { Role, TicketStatus, Priority } = $Enums;

// Prisma 7 requires a driver adapter — the schema no longer holds the DB URL.
// The CLI (prisma db seed) loads prisma.config.ts for migrations, but the
// PrismaClient instance in this script still needs its own connection.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── 1. Clean existing data ─────────────────────────────────────────────
  // Delete in reverse dependency order to avoid foreign key violations.
  // (comments → tickets → labels/memberships → workspaces → users)
  await prisma.comment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.label.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  console.log("✓ Cleared existing data");

  // ─── 2. Users ───────────────────────────────────────────────────────────
  // No passwords — we'll use OAuth (Google) in Phase 2.
  // For now, users are created bare so the seed script works without auth setup.
  const alice = await prisma.user.create({
    data: {
      email: "alice@acme.com",
      name: "Alice Chen",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: "bob@acme.com",
      name: "Bob Martinez",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
    },
  });

  const carol = await prisma.user.create({
    data: {
      email: "carol@nova.com",
      name: "Carol Singh",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=carol",
    },
  });

  const dave = await prisma.user.create({
    data: {
      email: "dave@nova.com",
      name: "Dave Kim",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=dave",
    },
  });

  console.log("✓ Created 4 users");

  // ─── 3. Workspaces ──────────────────────────────────────────────────────
  // slug is used in URLs: /acme-corp/tickets
  // IMPORTANT: these two workspaces are completely isolated — tickets, labels,
  // and members from one can NEVER appear in the other.
  const acme = await prisma.workspace.create({
    data: {
      name: "Acme Corp",
      slug: "acme-corp",
    },
  });

  const nova = await prisma.workspace.create({
    data: {
      name: "Nova Labs",
      slug: "nova-labs",
    },
  });

  console.log("✓ Created 2 workspaces");

  // ─── 4. Memberships ─────────────────────────────────────────────────────
  // This is the RBAC join table. alice is ADMIN of acme, bob is MEMBER.
  // carol is ADMIN of nova, dave is MEMBER.
  // The @@unique([userId, workspaceId]) constraint means we can't insert
  // the same user twice into the same workspace — Postgres enforces this.
  await prisma.membership.createMany({
    data: [
      // Acme Corp
      { userId: alice.id, workspaceId: acme.id, role: Role.ADMIN },
      { userId: bob.id, workspaceId: acme.id, role: Role.MEMBER },
      // Nova Labs
      { userId: carol.id, workspaceId: nova.id, role: Role.ADMIN },
      { userId: dave.id, workspaceId: nova.id, role: Role.MEMBER },
    ],
  });

  console.log("✓ Created 4 memberships (2 per workspace)");

  // ─── 5. Labels ──────────────────────────────────────────────────────────
  // Labels are workspace-scoped. Acme's labels are invisible to Nova users.
  // The AI triage feature will pick from THESE labels — so they must exist first.
  const [bugLabel, featureLabel, authLabel] = await Promise.all([
    prisma.label.create({
      data: { name: "bug", color: "#ef4444", workspaceId: acme.id },
    }),
    prisma.label.create({
      data: { name: "feature", color: "#3b82f6", workspaceId: acme.id },
    }),
    prisma.label.create({
      data: { name: "auth", color: "#8b5cf6", workspaceId: acme.id },
    }),
  ]);

  const [perfLabel, uiLabel, apiLabel] = await Promise.all([
    prisma.label.create({
      data: { name: "performance", color: "#f59e0b", workspaceId: nova.id },
    }),
    prisma.label.create({
      data: { name: "ui", color: "#10b981", workspaceId: nova.id },
    }),
    prisma.label.create({
      data: { name: "api", color: "#6366f1", workspaceId: nova.id },
    }),
  ]);

  console.log("✓ Created 6 labels (3 per workspace)");

  // ─── 6. Tickets ─────────────────────────────────────────────────────────
  // 4 tickets for Acme, 4 for Nova. Mix of statuses and priorities
  // so the Kanban board has something in every column.
  //
  // Note the workspaceId on EVERY ticket — this is tenant isolation in practice.

  // --- Acme Corp tickets ---
  const acmeTicket1 = await prisma.ticket.create({
    data: {
      title: "Users can't log in with Google SSO",
      description:
        "After the OAuth redirect, users hit a 500 error. The callback URL appears to be misconfigured in the Google Cloud Console. Affects all users trying to sign in with Google. Workaround: use email/password login.",
      status: TicketStatus.OPEN,
      priority: Priority.CRITICAL,
      workspaceId: acme.id,
      createdById: alice.id,
      assigneeId: bob.id,
      labels: {
        // connect is how you link to existing records in a many-to-many
        connect: [{ id: bugLabel.id }, { id: authLabel.id }],
      },
    },
  });

  const acmeTicket2 = await prisma.ticket.create({
    data: {
      title: "Add dark mode support",
      description:
        "The app currently only supports light mode. We should respect the user's OS preference (prefers-color-scheme) and add a manual toggle in the settings page.",
      status: TicketStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      workspaceId: acme.id,
      createdById: bob.id,
      assigneeId: bob.id,
      labels: {
        connect: [{ id: featureLabel.id }],
      },
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Kanban board reorders on every page refresh",
      description:
        "The ticket ordering isn't persisted. When the page refreshes, cards go back to creation-date order instead of the last drag-and-drop order. Need to store the order in the DB.",
      status: TicketStatus.IN_REVIEW,
      priority: Priority.HIGH,
      workspaceId: acme.id,
      createdById: alice.id,
      assigneeId: alice.id,
      labels: {
        connect: [{ id: bugLabel.id }, { id: featureLabel.id }],
      },
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Write API documentation",
      description:
        "We need OpenAPI/Swagger docs for all public endpoints. Preferably auto-generated from the route handler types. Could use next-swagger-doc or similar.",
      status: TicketStatus.DONE,
      priority: Priority.LOW,
      workspaceId: acme.id,
      createdById: alice.id,
      assigneeId: null, // unassigned is valid
      labels: {
        connect: [{ id: featureLabel.id }],
      },
    },
  });

  // --- Nova Labs tickets ---
  const novaTicket1 = await prisma.ticket.create({
    data: {
      title: "Dashboard query takes 8 seconds to load",
      description:
        "The main dashboard aggregation query is doing a full table scan on the tickets table. Profiling shows it's not using the workspaceId index. Need to add EXPLAIN ANALYZE and fix the query plan.",
      status: TicketStatus.OPEN,
      priority: Priority.HIGH,
      workspaceId: nova.id,
      createdById: carol.id,
      assigneeId: dave.id,
      labels: {
        connect: [{ id: perfLabel.id }, { id: apiLabel.id }],
      },
    },
  });

  const novaTicket2 = await prisma.ticket.create({
    data: {
      title: "Redesign the ticket detail page",
      description:
        "Current layout is too cramped on mobile. The comment thread overlaps the metadata panel on screens < 768px. Need a responsive layout that collapses the sidebar on mobile.",
      status: TicketStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      workspaceId: nova.id,
      createdById: dave.id,
      assigneeId: dave.id,
      labels: {
        connect: [{ id: uiLabel.id }],
      },
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Rate limit the public API endpoints",
      description:
        "Currently there's no rate limiting on the public API. A single client can hammer the /tickets endpoint. Need to add upstash/ratelimit or similar middleware.",
      status: TicketStatus.IN_REVIEW,
      priority: Priority.HIGH,
      workspaceId: nova.id,
      createdById: carol.id,
      assigneeId: carol.id,
      labels: {
        connect: [{ id: apiLabel.id }],
      },
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Add CSV export for tickets",
      description:
        "PMs need to export ticket data to Excel for weekly reports. Add a download button on the dashboard that generates a CSV of all tickets filtered by the current view.",
      status: TicketStatus.DONE,
      priority: Priority.LOW,
      workspaceId: nova.id,
      createdById: carol.id,
      assigneeId: dave.id,
      labels: {
        connect: [{ id: uiLabel.id }, { id: apiLabel.id }],
      },
    },
  });

  console.log("✓ Created 8 tickets (4 per workspace, all statuses covered)");

  // ─── 7. Comments ────────────────────────────────────────────────────────
  // Add comments to the IN_PROGRESS tickets so the comment thread has data.
  await prisma.comment.createMany({
    data: [
      // Acme — dark mode ticket
      {
        body: "I've started on the CSS variables approach. The light mode tokens are done, working on dark now.",
        ticketId: acmeTicket2.id,
        authorId: bob.id,
      },
      {
        body: "Looks good! Make sure to test with the system preference as well, not just the toggle.",
        ticketId: acmeTicket2.id,
        authorId: alice.id,
      },
      // Nova — dashboard ticket
      {
        body: "EXPLAIN ANALYZE output: Seq Scan on tickets (cost=0.00..4821.00 rows=2000 width=248). Definitely not using the index.",
        ticketId: novaTicket1.id,
        authorId: dave.id,
      },
      {
        body: "The issue is the query has a CAST on workspaceId. Remove the cast and the index should kick in.",
        ticketId: novaTicket1.id,
        authorId: carol.id,
      },
    ],
  });

  console.log("✓ Created 4 comments");

  // ─── Summary ────────────────────────────────────────────────────────────
  console.log(`
✅ Seed complete!

Data summary:
  Users:       4 (alice, bob, carol, dave)
  Workspaces:  2 (acme-corp, nova-labs)
  Memberships: 4 (alice=ADMIN@acme, bob=MEMBER@acme, carol=ADMIN@nova, dave=MEMBER@nova)
  Labels:      6 (3 per workspace)
  Tickets:     8 (4 per workspace — OPEN/IN_PROGRESS/IN_REVIEW/DONE)
  Comments:    4 (2 per in-progress ticket)

Isolation check:
  → alice (acme) should NEVER see nova's tickets
  → carol (nova) should NEVER see acme's tickets
  → This is enforced by WHERE workspaceId = ? in every query
`);
}

// Run and handle errors cleanly
main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    // Always disconnect after seed, otherwise the script hangs
    await prisma.$disconnect();
  });
