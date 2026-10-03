// AI study/library assistant.
// The browser sends the chat so far; this function finds matching catalog items,
// hands them to Claude as the only source of truth, and returns the answer.
// Secrets: supabase secrets set ANTHROPIC_API_KEY=...   (optional: ANTHROPIC_MODEL=...)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5-20251001";
const HOURLY_LIMIT = 20;

const TYPE_LABEL: Record<string, string> = {
  academic_book: "Academic Book",
  ebook: "eBook",
  pdf: "PDF",
  revision_note: "Revision Note",
  past_question: "Past Question",
};

const STOP = new Set(
  ("the and for with that this what which where when who how are was were you your can could would should " +
    "any all some have has had not but from about into over under than then them they their there here " +
    "please need want find show give tell help get got let make made more most much many very just also " +
    "book books resource resources material materials notes note question questions past pdf ebook ebooks " +
    "library recommend suggest looking look best good").split(" ")
);

function keywords(text: string): string[] {
  const lower = text.toLowerCase();
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (w: string) => { if (!seen.has(w)) { seen.add(w); out.push(w); } };

  // course codes written as "CSC 301" or "csc301"
  for (const m of lower.matchAll(/\b([a-z]{3})\s?(\d{3})\b/g)) add(m[1] + m[2]);
  for (const w of lower.match(/[a-z0-9]+/g) ?? []) {
    if (w.length < 3 || STOP.has(w)) continue;
    add(w);
  }
  return out.slice(0, 8);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "The assistant is not set up yet." }, 503);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Please sign in again." }, 401);

    // ---- rate limit ----
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await supabase
      .from("assistant_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("used_at", since);
    if ((count ?? 0) >= HOURLY_LIMIT) {
      return json({ error: "You've reached the hourly limit for the assistant. Please try again later." }, 429);
    }

    // ---- read and clean the chat ----
    const body = await req.json().catch(() => ({}));
    const raw: unknown[] = Array.isArray(body?.messages) ? body.messages : [];
    let history = raw
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-8)
      .map((m: any) => ({ role: m.role as string, content: String(m.content).slice(0, 1000) }));
    while (history.length && history[0].role !== "user") history = history.slice(1);
    if (!history.length || history[history.length - 1].role !== "user") {
      return json({ error: "Ask a question first." }, 400);
    }

    await supabase.from("assistant_usage").insert({ user_id: user.id });

    // ---- student context ----
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, level, department")
      .eq("id", user.id)
      .maybeSingle();

    // ---- find catalog items ----
    const userText = history.filter((m) => m.role === "user").slice(-2).map((m) => m.content).join(" ");
    const kws = keywords(userText);
    const select = "id, type, title, author, course_code, department, faculty, level, semester, description, available_copies, total_copies";
    const cols = ["title", "author", "course_code", "department", "faculty", "description"];

    let rows: any[] = [];
    if (kws.length) {
      const filter = kws.flatMap((k) => cols.map((c) => `${c}.ilike.%${k}%`)).join(",");
      const { data } = await supabase.from("resources").select(select).or(filter).limit(60);
      rows = data ?? [];
    }
    if (!rows.length) {
      let q = supabase.from("resources").select(select).order("created_at", { ascending: false }).limit(8);
      if (profile?.department) q = q.ilike("department", `%${String(profile.department).replace(/[%,]/g, "")}%`);
      const { data } = await q;
      rows = data ?? [];
    }

    const score = (r: any) => {
      let s = 0;
      const title = String(r.title ?? "").toLowerCase();
      const code = String(r.course_code ?? "").toLowerCase();
      const rest = [r.author, r.department, r.faculty, r.description].join(" ").toLowerCase();
      for (const k of kws) {
        if (code.includes(k)) s += 4;
        if (title.includes(k)) s += 3;
        if (rest.includes(k)) s += 1;
      }
      if (profile?.level && String(r.level ?? "") === String(profile.level)) s += 0.5;
      return s;
    };
    const top = rows.map((r) => ({ r, s: score(r) })).sort((a, b) => b.s - a.s).slice(0, 8).map((x) => x.r);

    const catalog = top.length
      ? top
          .map((r, i) => {
            const copies = r.type === "academic_book" ? ` | copies ${r.available_copies ?? "?"}/${r.total_copies ?? "?"}` : "";
            const desc = String(r.description ?? "").replace(/\s+/g, " ").slice(0, 160);
            return `[${i + 1}] ${TYPE_LABEL[r.type] ?? r.type} | ${r.title} | ${r.author ?? "unknown author"} | ${r.course_code ?? "no code"} | ${r.department ?? ""} | level ${r.level ?? "?"} sem ${r.semester ?? "?"}${copies}${desc ? " | " + desc : ""}`;
          })
          .join("\n")
      : "(no matching items found)";

    const system = `You are SmartLib Assistant, the helper inside the FUTO SmartLib digital library at the Federal University of Technology, Owerri.
The student is ${profile?.full_name ?? "a student"}, level ${profile?.level ?? "unknown"}, department ${profile?.department ?? "unknown"}.

Rules:
- Recommend ONLY items from the CATALOG RESULTS below. Never invent titles, authors, course codes or availability.
- If nothing there fits the question, say so plainly and suggest searching by course code, title or department.
- You may explain a study topic briefly (under 120 words), then point to matching catalog items.
- Library rules: students borrow Academic Books for up to 14 days; a late return costs N500 per day; fees are paid in person to the librarian using the borrow reference. eBooks, PDFs, revision notes and past questions are opened online.
- Be friendly and concise. No headings. Short paragraphs or "-" lists only.

Reply with JSON only, no other text: {"answer": "<text for the student>", "used": [<numbers of the catalog items you mention>]}

CATALOG RESULTS:
${catalog}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, system, messages: history }),
    });
    if (!res.ok) {
      console.error("Anthropic error", res.status, await res.text());
      return json({ error: "The assistant is unavailable right now. Please try again." }, 502);
    }

    const out = await res.json();
    const text: string = (out?.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();

    let answer = text;
    let used: number[] = [];
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const parsed = JSON.parse(m[0]);
        if (typeof parsed.answer === "string" && parsed.answer.trim()) answer = parsed.answer.trim();
        if (Array.isArray(parsed.used)) used = parsed.used.map((n: unknown) => Number(n)).filter((n: number) => n >= 1 && n <= top.length);
      } catch { /* fall back to the raw text */ }
    }

    const resources = [...new Set(used)].slice(0, 5).map((n) => {
      const r = top[n - 1];
      return { id: r.id, title: r.title, type: r.type, course_code: r.course_code };
    });

    return json({ answer: answer || "Sorry, I couldn't put an answer together. Please try rephrasing.", resources });
  } catch (err) {
    console.error(err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
