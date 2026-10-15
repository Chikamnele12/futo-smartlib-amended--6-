import { supabase } from "./supabaseClient";

export const PENALTY_PER_DAY = 500; // ₦500 per day overdue
export const BORROW_DAYS = 8; // default AND maximum loan length (database policy allows up to 9 days)
export const MAX_BORROW_DAYS = BORROW_DAYS;

// "YYYY-MM-DD" in the user's LOCAL time (toISOString would shift it to UTC).
export function toInputDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

// Borrow a book: creates the borrowed_items row, then asks the
// "send-borrow-email" Edge Function to email the student a confirmation
// containing the book name, department, matric number and the penalty.
// returnDateStr is an optional "YYYY-MM-DD" chosen by the student. It must be
// between tomorrow and MAX_BORROW_DAYS from now; the book is due at the end
// of that day (local time). Without it, the default loan length is used.
export async function borrowResource(resource, profile, returnDateStr) {
  let dueDate;
  if (returnDateStr) {
    const [y, m, d] = returnDateStr.split("-").map(Number);
    dueDate = new Date(y, (m || 1) - 1, d || 1, 23, 59, 0);
    const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);
    const latest = addDays(MAX_BORROW_DAYS); latest.setHours(23, 59, 59, 999);
    if (isNaN(dueDate) || dueDate < tomorrow || dueDate > latest) {
      return { error: { message: `Choose a return date between tomorrow and ${MAX_BORROW_DAYS} days from now.` } };
    }
  } else {
    dueDate = addDays(BORROW_DAYS);
  }

  const { data, error } = await supabase
    .from("borrowed_items")
    .insert({
      resource_id: resource.id,
      user_id: profile.id,
      due_date: dueDate.toISOString(),
      status: "borrowed",
    })
    .select()
    .single();

  if (error) return { error };

  // Email is sent by a Supabase Edge Function so the Resend API key never
  // touches the browser. A failed email must never block the borrow, but we
  // log it: supabase.functions.invoke() returns { error } instead of throwing.
  try {
    const { data: emailResult, error: emailError } = await supabase.functions.invoke("send-borrow-email", {
      body: {
        to: profile.email,
        full_name: profile.full_name,
        matric_number: profile.matric_number,
        department: profile.department,
        level: profile.level,
        phone: profile.phone,
        borrow_ref: data.borrow_ref,
        book_title: resource.title,
        due_date: dueDate.toISOString(),
        penalty_per_day: PENALTY_PER_DAY,
      },
    });
    if (emailError) console.warn("Borrow email failed:", emailError.message);
    else if (emailResult?.skipped) console.warn("Borrow email skipped: RESEND_API_KEY not set on the server.");
  } catch (e) {
    console.warn("Borrow email failed to send:", e.message);
  }

  await supabase.from("notifications").insert({
    user_id: profile.id,
    title: "Book borrowed",
    message: `You borrowed "${resource.title}". Reference: ${data.borrow_ref}. Due back ${dueDate.toLocaleDateString()}. Late fee is ₦${PENALTY_PER_DAY}/day. Show this reference to the librarian to pay fees or return the book.`,
  });

  return { data };
}

export function feeOwed(item) {
  if (item.status === "returned" && item.returned_at) {
    const late = Math.max(0, Math.ceil((new Date(item.returned_at) - new Date(item.due_date)) / 86400000));
    return late * PENALTY_PER_DAY;
  }
  if (item.status !== "returned") {
    const late = Math.max(0, Math.ceil((Date.now() - new Date(item.due_date)) / 86400000));
    return late * PENALTY_PER_DAY;
  }
  return 0;
}
