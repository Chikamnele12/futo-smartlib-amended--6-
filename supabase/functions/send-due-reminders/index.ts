// Supabase Edge Function: send-due-reminders
// Runs once a day (see supabase/reminders.sql). For every unreturned book it:
//   * emails + notifies the student 2 days before the due date ("due soon")
//   * emails + notifies them every 3 days once overdue, with the fee so far
// Duplicates are prevented with columns added in supabase/reminders.sql.
//
// Deploy:  supabase functions deploy send-due-reminders --no-verify-jwt
// Secrets: supabase secrets set RESEND_API_KEY=... EMAIL_FROM="..." CRON_SECRET=<long random string>

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  callout, corsHeaders, detailsTable, esc, formatDate, json, layout, naira, sendMails, type Mail,
} from "../_shared/email.ts";

const PENALTY = Number(Deno.env.get("PENALTY_PER_DAY") ?? 500);
const DUE_SOON_DAYS = 2;
const OVERDUE_EVERY_DAYS = 3;
const DAY = 86400000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Only the scheduler (which knows the secret) may trigger this.
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Date.now();
  const soonCutoff = new Date(now + DUE_SOON_DAYS * DAY).toISOString();

  const { data: items, error } = await supabase
    .from("borrowed_items")
    .select(
      "id, due_date, due_soon_notified_at, last_overdue_notified_at, user_id, resources(title), profiles(full_name, email, matric_number, department)",
    )
    .neq("status", "returned")
    .is("returned_at", null)
    .lte("due_date", soonCutoff);

  if (error) return json({ error: error.message }, 500);

  const mails: Mail[] = [];
  const notifications: { user_id: string; title: string; message: string }[] = [];
  const dueSoonIds: string[] = [];
  const overdueIds: string[] = [];

  for (const it of items ?? []) {
    // deno-lint-ignore no-explicit-any
    const p = (it as any).profiles;
    // deno-lint-ignore no-explicit-any
    const title: string = (it as any).resources?.title ?? "your book";
    if (!p?.email) continue;

    const due = new Date(it.due_date).getTime();

    if (due > now) {
      // ---- due soon ----
      if (it.due_soon_notified_at) continue;
      const daysLeft = Math.max(1, Math.ceil((due - now) / DAY));
      dueSoonIds.push(it.id);
      notifications.push({
        user_id: it.user_id,
        title: "Book due soon",
        message: `"${title}" is due on ${formatDate(it.due_date)} (${daysLeft} day${daysLeft > 1 ? "s" : ""} left). Late fee is ${naira(PENALTY)}/day.`,
      });
      mails.push({
        to: p.email,
        subject: `Reminder: "${title}" is due ${formatDate(it.due_date)}`,
        html: layout(
          "Your book is due soon",
          `<p>Hi ${esc(p.full_name || "there")},</p>
           <p>This is a reminder that a book you borrowed is due back soon.</p>
           ${detailsTable([
             ["Book", `<b>${esc(title)}</b>`],
             ["Due date", `<b>${esc(formatDate(it.due_date))}</b>`],
             ["Time left", `${daysLeft} day${daysLeft > 1 ? "s" : ""}`],
           ])}
           ${callout(
             `Return it on time to avoid a penalty of <b>${esc(naira(PENALTY))} per day</b>.`,
             "#fffbeb",
             "#f59e0b",
           )}
           <p>— FUTO SmartLib</p>`,
          "#f59e0b",
        ),
      });
    } else {
      // ---- overdue ----
      const last = it.last_overdue_notified_at
        ? new Date(it.last_overdue_notified_at).getTime()
        : 0;
      if (last && now - last < OVERDUE_EVERY_DAYS * DAY) continue;
      const daysLate = Math.max(1, Math.ceil((now - due) / DAY));
      const fee = daysLate * PENALTY;
      overdueIds.push(it.id);
      notifications.push({
        user_id: it.user_id,
        title: "Book overdue",
        message: `"${title}" is ${daysLate} day${daysLate > 1 ? "s" : ""} overdue. Fee so far: ${naira(fee)}. Please return it to the library.`,
      });
      mails.push({
        to: p.email,
        subject: `Overdue: please return "${title}"`,
        html: layout(
          "Your book is overdue",
          `<p>Hi ${esc(p.full_name || "there")},</p>
           <p>A book you borrowed has passed its due date.</p>
           ${detailsTable([
             ["Book", `<b>${esc(title)}</b>`],
             ["Was due", esc(formatDate(it.due_date))],
             ["Days overdue", `<b>${daysLate}</b>`],
             ["Fee so far", `<b>${esc(naira(fee))}</b>`],
             ["Matric No.", esc(p.matric_number || "—")],
           ])}
           ${callout(
             `The fee grows by <b>${esc(naira(PENALTY))}</b> every day until the book is returned. Please return it to the library as soon as possible.`,
             "#fef2f2",
             "#ef4444",
           )}
           <p>— FUTO SmartLib</p>`,
          "#ef4444",
        ),
      });
    }
  }

  // In-app notifications always get created, even if email isn't configured.
  if (notifications.length) {
    const { error: nErr } = await supabase.from("notifications").insert(notifications);
    if (nErr) console.error("notification insert failed:", nErr.message);
  }

  const result = await sendMails(mails);

  // Only mark as notified if the emails really went out (or email is
  // not configured, so we don't re-create the in-app notification daily).
  const markOk = result.skipped || result.failed === 0;
  if (markOk) {
    const stamp = new Date().toISOString();
    if (dueSoonIds.length)
      await supabase.from("borrowed_items").update({ due_soon_notified_at: stamp }).in("id", dueSoonIds);
    if (overdueIds.length)
      await supabase.from("borrowed_items").update({ last_overdue_notified_at: stamp }).in("id", overdueIds);
  }

  return json({
    checked: items?.length ?? 0,
    dueSoon: dueSoonIds.length,
    overdue: overdueIds.length,
    email: result,
  });
});
