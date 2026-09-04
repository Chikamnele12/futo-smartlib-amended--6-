// Supabase Edge Function: send-borrow-email
// Deploy with:  supabase functions deploy send-borrow-email
// Set secret:   supabase secrets set RESEND_API_KEY=your_resend_key
//
// Sends the student an email confirming the book they borrowed, their
// matric number/department, the due date, and the ₦500/day penalty.

// @ts-ignore - Deno remote import, resolved at deploy time
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("BORROW_EMAIL_FROM") || "SmartLib <library@yourdomain.com>";

serve(async (req) => {
  try {
    const { to, full_name, matric_number, department, book_title, due_date, penalty_per_day } = await req.json();

    if (!to || !book_title) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const dueDateStr = new Date(due_date).toLocaleDateString("en-NG", {
      year: "numeric", month: "long", day: "numeric",
    });

    const html = `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: auto; color: #1a1a1a;">
        <h2>FUTO SmartLib — Borrow Confirmation</h2>
        <p>Hi ${full_name || "there"},</p>
        <p>You have successfully borrowed the following item:</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding:6px 0; color:#555;">Book</td><td style="padding:6px 0;"><b>${book_title}</b></td></tr>
          <tr><td style="padding:6px 0; color:#555;">Department</td><td style="padding:6px 0;">${department || "—"}</td></tr>
          <tr><td style="padding:6px 0; color:#555;">Matric No.</td><td style="padding:6px 0;">${matric_number || "—"}</td></tr>
          <tr><td style="padding:6px 0; color:#555;">Due date</td><td style="padding:6px 0;"><b>${dueDateStr}</b></td></tr>
        </table>
        <p style="background:#fdf2ec; border-left:3px solid #b5561f; padding:10px 14px;">
          Please return this book by the due date. A penalty of <b>₦${penalty_per_day} per day</b>
          applies for every day the book is returned late.
        </p>
        <p>— FUTO SmartLib</p>
      </div>
    `;

    if (!RESEND_API_KEY) {
      // No email provider configured yet — log instead of failing the borrow.
      console.log("RESEND_API_KEY not set. Would have sent:", { to, html });
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: `Borrow confirmation: ${book_title}`,
        html,
      }),
    });

    if (!resendResp.ok) {
      const errText = await resendResp.text();
      return new Response(JSON.stringify({ error: errText }), { status: 500 });
    }

    return new Response(JSON.stringify({ sent: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
