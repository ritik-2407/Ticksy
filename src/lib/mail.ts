/**
 * Sends the workspace invite through Resend's HTTP API.
 *
 * No SDK: one POST is the whole integration. When RESEND_API_KEY or
 * RESEND_FROM is missing, this returns { sent: false } and the route
 * still hands the admin the link to copy. A failed send does the same,
 * so a mail outage does not throw away a valid invite.
 */

export async function sendInviteEmail(input: {
  to: string;
  workspaceName: string;
  role: "ADMIN" | "MEMBER";
  inviteUrl: string;
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) return { sent: false };

  const workspace = escapeHtml(input.workspaceName);
  const role = input.role === "ADMIN" ? "an admin" : "a member";
  const link = escapeHtml(input.inviteUrl);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `Join ${input.workspaceName} on Ticksy`,
      text: [
        `You have been invited to ${input.workspaceName} on Ticksy as ${role}.`,
        `This link works for 48 hours and only for ${input.to}:`,
        input.inviteUrl,
      ].join("\n\n"),
      html: `<p>You have been invited to <strong>${workspace}</strong> on Ticksy as ${role}.</p>
<p>This link works for 48 hours and only for ${escapeHtml(input.to)}.</p>
<p><a href="${link}">Accept invite</a></p>`,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[sendInviteEmail]", res.status, detail);
    return { sent: false };
  }

  return { sent: true };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
