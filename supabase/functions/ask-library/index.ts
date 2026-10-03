// AI study/library assistant.
// The browser sends the chat so far; this function finds matching catalog items,
// hands them to Claude as the only source of truth, and returns the answer.
// Secrets (set ONE of these):
//   GEMINI_API_KEY     -> Google Gemini's free tier (key from aistudio.google.com)
//   ANTHROPIC_API_KEY  -> Claude (paid, a few cents per hundred questions with Haiku)
// Optional: GEMINI_MODEL, ANTHROPIC_MODEL, HOURLY_LIMIT. If both keys exist, Gemini (free) is used.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const CLAUDE_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5-20251001";
// Flash-Lite has the most generous free limits; the "-latest" alias keeps working when Google retires old versions
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-flash-lite-latest";

class ModelError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

async function askClaude(key: string, system: string, history: { role: string; content: string }[]): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 700, system, messages: history }),
  });
  if (!res.ok) {
    console.error("Anthropic error", res.status, await res.text());
    throw new ModelError("claude", res.status);
  }
  const out = await res.json();
  return (out?.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
}

async function askGemini(key: string, system: string, history: { role: string; content: string }[]): Promise<string> {
  // Gemini wants alternating user / model turns
  const contents: { role: string; parts: { text: string }[] }[] = [];
  for (const m of history) {
    const role = m.role === "assistant" ? "model" : "user";
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += "\n" + m.content;
    else contents.push({ role, parts: [{ text: m.content }] });
  }

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: {
      maxOutputTokens: 2000,
      temperature: 0.4,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          answer: { type: "STRING" },
          used: { type: "ARRAY", items: { type: "INTEGER" } },
        },
        required: ["answer", "used"],
      },
    },
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body,
    });
    // free keys share per-minute limits across all students: wait a moment and try once more
    if (res.status === 429 && attempt === 0) { await new Promise((r) => setTimeout(r, 1500)); continue; }
    if (!res.ok) {
      console.error("Gemini error", res.status, await res.text());
      throw new ModelError("gemini", res.status);
    }
    const out = await res.json();
    const parts = out?.candidates?.[0]?.content?.parts ?? [];
    return parts.map((p: any) => p.text ?? "").join("").trim();
  }
  throw new ModelError("gemini", 429);
}
const HOURLY_LIMIT = Number(Deno.env.get("HOURLY_LIMIT") ?? "15");

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
    "library recommend suggest looking look best good " +
    "level levels course courses semester department faculty year class").split(" ")
);

// "past questions", "ebook", "pdf"... decide which kinds of resource to search
function detectTypes(text: string): string[] {
  const t = text.toLowerCase();
  const out: string[] = [];
  if (/past\s+question|exam\s+question|\bpq\b/.test(t)) out.push("past_question");
  if (/revision/.test(t)) out.push("revision_note");
  if (/\be-?books?\b/.test(t)) out.push("ebook");
  if (/\bpdfs?\b/.test(t)) out.push("pdf");
  if (/textbook|academic book/.test(t)) out.push("academic_book");
  return out;
}

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
    const claudeKey = Deno.env.get("ANTHROPIC_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!claudeKey && !geminiKey) return json({ error: "The assistant is not set up yet." }, 503);

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
      .select("level, department")
      .eq("id", user.id)
      .maybeSingle();

    // ---- find catalog items ----
    const userText = history.filter((m) => m.role === "user").slice(-2).map((m) => m.content).join(" ");
    const kws = keywords(userText);
    const select = "id, type, title, author, course_code, department, faculty, level, semester, description, available_copies, total_copies";
    const cols = ["title", "author", "course_code", "department", "faculty", "description"];

    const types = detectTypes(userText);
    const personal = /\b(my level|my department|my faculty|for me|my courses?|my year)\b/i.test(userText);
    const withType = (q: any) => (types.length ? q.in("type", types) : q);
    const byId = new Map<string, any>();
    const addRows = (list: any[] | null) => (list ?? []).forEach((r) => byId.set(String(r.id), r));

    if (kws.length) {
      const filter = kws.flatMap((k) => cols.map((c) => `${c}.ilike.%${k}%`)).join(",");
      const { data } = await withType(supabase.from("resources").select(select).or(filter)).limit(60);
      addRows(data);
    }
    // "for my level" questions (or nothing found): look at the student's own level and department first
    if (personal || byId.size === 0) {
      const level = profile?.level ? String(profile.level).replace(/[%,]/g, "") : "";
      const dept = profile?.department ? String(profile.department).replace(/[%,]/g, "") : "";
      const attempts: [string, string][] = [[level, dept], [level, ""], ["", dept], ["", ""]];
      for (const [lv, dp] of attempts) {
        let q = withType(supabase.from("resources").select(select)).order("created_at", { ascending: false }).limit(12);
        if (lv) q = q.ilike("level", `%${lv}%`);
        if (dp) q = q.ilike("department", `%${dp}%`);
        const { data } = await q;
        if (data?.length) { addRows(data); break; }
      }
    }
    const rows = [...byId.values()];

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
      if (profile?.level && String(r.level ?? "").includes(String(profile.level))) s += personal ? 1.5 : 0.5;
      if (personal && profile?.department && String(r.department ?? "").toLowerCase().includes(String(profile.department).toLowerCase())) s += 1;
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
The student is at level ${profile?.level ?? "unknown"}, department ${profile?.department ?? "unknown"}.

Rules:
- Recommend ONLY items from the CATALOG RESULTS below. Never invent titles, authors, course codes or availability.
- If nothing there fits the question, say so plainly and suggest searching by course code, title or department.
- You may explain a study topic briefly (under 120 words), then point to matching catalog items.
- Library rules: students borrow Academic Books for up to 14 days; a late return costs N500 per day; fees are paid in person to the librarian using the borrow reference. eBooks, PDFs, revision notes and past questions are opened online.
- Be friendly and concise. No headings. Short paragraphs or "-" lists only.

Reply with JSON only, no other text: {"answer": "<text for the student>", "used": [<numbers of the catalog items you mention>]}

CATALOG RESULTS:
${catalog}`;

    let text = "";
    try {
      text = geminiKey ? await askGemini(geminiKey, system, history) : await askClaude(claudeKey!, system, history);
    } catch (err) {
      if (err instanceof ModelError && err.status === 429) {
        return json({ error: "The AI service is busy right now. Please try again in a minute." }, 429);
      }
      return json({ error: "The assistant is unavailable right now. Please try again." }, 502);
    }

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
