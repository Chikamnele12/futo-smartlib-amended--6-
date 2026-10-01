// Supabase Edge Function: send-borrow-email
// Called from the browser right after a student borrows a book.
// Deploy:  supabase functions deploy send-borrow-email
// Secrets: supabase secrets set RESEND_API_KEY=... EMAIL_FROM="SmartLib <library@yourdomain.com>"

import {
  callout, corsHeaders, detailsTable, esc, formatDate, json, layout, naira, sendMails,
} from "../_shared/email.ts";

Deno.serve(async (req) => {
  // Browser preflight — without this, supabase.functions.invoke() fails.
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { to, full_name, matric_number, department, level, phone, borrow_ref, book_title, due_date, penalty_per_day } =
      await req.json();

    if (!to || !book_title || !due_date) return json({ error: "Missing required fields" }, 400);

    const html = layout(
      "Borrow confirmation",
      `<p>Hi ${esc(full_name || "there")},</p>
       <p>You have successfully borrowed:</p>
       ${detailsTable([
         ["Reference", `<b style="font-size:18px;letter-spacing:1px;">${esc(borrow_ref || "—")}</b>`],
         ["Book", `<b>${esc(book_title)}</b>`],
         ["Department", esc(department || "—")],
         ["Level", esc(level ? `${level} Level` : "—")],
         ["Matric No.", esc(matric_number || "—")],
         ["Phone", esc(phone || "—")],
         ["Due date", `<b>${esc(formatDate(due_date))}</b>`],
       ])}
       ${callout(
         `Please return it by the due date. A penalty of <b>${esc(naira(penalty_per_day ?? 500))} per day</b> applies for every day it is late. You will get a reminder before it is due.`,
         "#eef2ff",
         "#6366f1",
       )}
       ${callout(
         `Keep your reference <b>${esc(borrow_ref || "")}</b>. Payment of any late fee is made in person at the library. Give this reference to the librarian when you pay or return the book, and they will mark it as returned.`,
         "#ecfdf5",
         "#10b981",
       )}
       <p>— FUTO SmartLib</p>`,
    );

    const result = await sendMails([
      { to, subject: `Borrow confirmation: ${book_title}`, html },
    ]);

    if (result.skipped) {
      console.log("RESEND_API_KEY not set — email skipped for", to);
      return json({ skipped: true });
    }
    if (result.failed) return json({ error: result.lastError || "Send failed" }, 502);
    return json({ sent: true });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
