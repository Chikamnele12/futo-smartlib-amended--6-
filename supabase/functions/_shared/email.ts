// Shared helpers for SmartLib email functions.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Escape user-controlled text before putting it into HTML.
export function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Africa/Lagos",
  });
}

export function naira(n: number): string {
  return "₦" + Number(n).toLocaleString("en-NG");
}

// Branded wrapper. `accent` is a hex colour for the callout box.
export function layout(title: string, inner: string, accent = "#4f46e5") {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#1f2937;">
    <div style="background:${accent};color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;">
      <div style="font-size:12px;opacity:.8;letter-spacing:.5px;">FUTO SMARTLIB</div>
      <div style="font-size:20px;font-weight:bold;margin-top:2px;">${esc(title)}</div>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:0;padding:20px;border-radius:0 0 12px 12px;">
      ${inner}
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">
        You are receiving this because you have an account on FUTO SmartLib.
      </p>
    </div>
  </div>`;
}

export function detailsTable(rows: [string, string][]) {
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#6b7280;width:38%;">${esc(k)}</td><td style="padding:6px 0;">${v}</td></tr>`,
    )
    .join("")}</table>`;
}

export function callout(html: string, bg: string, border: string) {
  return `<p style="background:${bg};border-left:4px solid ${border};padding:10px 14px;border-radius:4px;">${html}</p>`;
}

export type Mail = { to: string; subject: string; html: string };

// Sends up to 100 emails per request via Resend's batch endpoint.
// Returns { sent, failed } counts. Throws only if the key is missing.
export async function sendMails(mails: Mail[]) {
  const key = Deno.env.get("RESEND_API_KEY");
  const from =
    Deno.env.get("EMAIL_FROM") ||
    Deno.env.get("BORROW_EMAIL_FROM") ||
    "SmartLib <onboarding@resend.dev>";
  if (!key) return { skipped: true as const, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  let lastError = "";
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100);
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(
        chunk.map((m) => ({ from, to: [m.to], subject: m.subject, html: m.html })),
      ),
    });
    if (res.ok) sent += chunk.length;
    else {
      failed += chunk.length;
      lastError = await res.text();
    }
  }
  return { skipped: false as const, sent, failed, lastError };
}
