# Email setup: borrow confirmations + due-date reminders

Needs the Supabase CLI (`npm i -g supabase`, then `supabase login` and
`supabase link --project-ref YOUR_PROJECT_REF`). Run from the project folder.

## 1. Resend
1. Create a free account at https://resend.com and make an API key.
2. **Verify a domain you own** (Domains > Add). Until you do, Resend only
   delivers to your own account email, so students will not receive anything.
   Free plan: 100 emails/day, 3,000/month.

## 2. Secrets
```
supabase secrets set RESEND_API_KEY=re_xxx EMAIL_FROM="SmartLib <library@yourdomain.com>" CRON_SECRET=pick-a-long-random-string
```
Optional: `PENALTY_PER_DAY=500` (default 500).

## 3. Deploy
```
supabase functions deploy send-borrow-email
supabase functions deploy send-due-reminders --no-verify-jwt
```

## 4. Database + schedule
Open `supabase/reminders.sql`, replace `YOUR_PROJECT_REF` and `YOUR_CRON_SECRET`
(same value as step 2), then run it in the SQL Editor. Reminders go out daily
at 08:00 Lagos time.

## 5. Test
- Borrow a book with your own account. You should get the confirmation email.
- Trigger reminders manually (PowerShell):
  ```
  curl.exe -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-due-reminders -H "x-cron-secret: YOUR_CRON_SECRET"
  ```
  The JSON reply shows how many were checked / emailed.
- To force a reminder: in Table Editor > borrowed_items set a row's
  `due_date` to tomorrow (due soon) or last week (overdue), and clear
  `due_soon_notified_at` / `last_overdue_notified_at`.

## Reminder rules
- Due soon: once, 2 days before the due date.
- Overdue: every 3 days after the due date, with the fee so far.
- Returned books are never emailed.
- In-app notifications are created even when email is not configured.

## Registration emails
Sign-up confirmation emails are sent by Supabase Auth itself, not by these
functions. On the free plan that is limited to a few per hour. Set custom SMTP
under Authentication > SMTP Settings (Resend offers SMTP credentials) to lift it.
