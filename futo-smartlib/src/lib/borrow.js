import { supabase } from "./supabaseClient";

export const PENALTY_PER_DAY = 500; // ₦500 per day overdue
export const BORROW_DAYS = 14;

// Borrow a book: creates the borrowed_items row, then asks the
// "send-borrow-email" Edge Function to email the student a confirmation
// containing the book name, department, matric number and the penalty.
export async function borrowResource(resource, profile) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + BORROW_DAYS);

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

  // Fire-and-forget: email is sent by a Supabase Edge Function so the
  // SMTP/Resend API key never touches the browser. See
  // supabase/functions/send-borrow-email for the function code.
  try {
    await supabase.functions.invoke("send-borrow-email", {
      body: {
        to: profile.email,
        full_name: profile.full_name,
        matric_number: profile.matric_number,
        department: profile.department,
        book_title: resource.title,
        due_date: dueDate.toISOString(),
        penalty_per_day: PENALTY_PER_DAY,
      },
    });
  } catch (e) {
    // Don't block the borrow if email sending fails.
    console.warn("Borrow email failed to send:", e.message);
  }

  await supabase.from("notifications").insert({
    user_id: profile.id,
    title: "Book borrowed",
    message: `You borrowed "${resource.title}". Due back ${dueDate.toLocaleDateString()}. Late fee is ₦${PENALTY_PER_DAY}/day.`,
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
