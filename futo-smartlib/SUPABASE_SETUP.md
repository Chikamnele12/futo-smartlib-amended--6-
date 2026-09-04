# Connecting FUTO SmartLib to Supabase

## 1. Create a Supabase project
1. Go to https://supabase.com/dashboard and create a new project.
2. Wait for it to finish provisioning (~2 min).
3. Go to **Project Settings > API**. Copy:
   - **Project URL**
   - **anon public** key
   (Never copy the `service_role` key into frontend code — that one bypasses RLS.)

## 2. Set your environment variables
Copy the example file and fill in your real values:

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

`.env` is already in `.gitignore` — it will never be committed.

## 3. Run the database schema
1. In the Supabase Dashboard, go to **SQL Editor > New query**.
2. Paste the entire contents of `supabase/schema.sql`.
3. Run it. This creates:
   - `profiles`, `resources`, `resource_reviews`, `bookmarks`, `borrowed_items`, `notifications`
   - A trigger that auto-creates a `profiles` row when someone signs up
   - Row Level Security policies (students see everything but can only edit their own data; only librarians/admins can add or edit resources)
   - Storage buckets: `covers` (public), `resource-files` (private, authenticated-only), `avatars` (public)

## 4. Install the client library
```bash
npm install
```
(`@supabase/supabase-js` is already added to `package.json`.)

## 5. Create your first user
1. Run the app (`npm run dev`) and go to **Create an account** — this calls real Supabase sign-up and creates a `profiles` row automatically (default role: `student`).
2. By default, Supabase requires email confirmation. For local testing, you can turn this off: **Authentication > Providers > Email > Confirm email > off**. Otherwise, check your inbox for the confirmation link.
3. To make yourself staff, go to **Table Editor > profiles**, find your row, and change `role` to `librarian` or `admin`. (Once you're an admin, you can also do this from the app's Users page.)

## 6. Run the app
```bash
npm run dev
```
Every page — Login, Signup, Dashboard, all five catalog pages, Borrowed Items, Users, Notifications, Upload Resources, Settings, and Reports — now reads and writes real data through Supabase. Nothing is hardcoded.

## 7. Add some sample resources
In **Table Editor > resources**, insert a row, e.g.:
| type | title | author | course_code | department | faculty | level | semester |
|---|---|---|---|---|---|---|---|
| academic_book | Database Systems Concepts | Abraham Silberschatz | CSC 302 | Computer Science | Science | 300 | 2 |

Refresh the Academic Books page — it should appear.

## 8. What's wired up
- **Login / Signup** — real Supabase auth, with email confirmation
- **Dashboard** — live resource count, your active borrows, recent notifications
- **Academic Books / eBooks / PDF Library / Past Questions / Revision Notes** — all read from the `resources` table, filterable by faculty
- **Borrowed Items** — students see their own loans; staff see everyone's and can mark items returned
- **Notifications** — per-user, click to mark as read
- **Users** (staff only) — change any user's role
- **Upload Resources** (staff only) — uploads a file to Storage and inserts the catalog row
- **Settings** — edit your own profile
- **Reports** (staff only) — live counts and a chart of the collection by type

Route access is enforced by `ProtectedRoute` (signed-in only, or staff-only for Reports/Users/Upload Resources) and by the RLS policies in `schema.sql` — so even if someone bypasses the UI, the database itself refuses unauthorized writes.
