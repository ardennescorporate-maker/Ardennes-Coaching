"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/viewer";
import { allow } from "@/lib/server/ratelimit";
import { checkAchievements, type Badge } from "@/lib/server/gamify";
import { FEEDBACK_CATEGORIES } from "@/lib/domain/feedback";


const Input = z.object({ category: z.enum(FEEDBACK_CATEGORIES), rating: z.number().int().min(1).max(5).nullable(), body: z.string().trim().min(3).max(4000), page: z.string().max(200).optional() });

export async function sendFeedbackAction(input: unknown): Promise<{ error?: string; badges?: Badge[] }> {
  const v = await getViewer();
  if (!v) return { error: "Please log in again." };
  const p = Input.safeParse(input);
  if (!p.success) return { error: "Tell us a bit more in the details box." };
  if (!(await allow(`feedback:${v.userId}`, 20, 3600))) return { error: "Thanks for all the feedback! Please wait a little before sending more." };
  const { error } = await adminClient()
    .from("feedback")
    .insert({ user_id: v.userId, category: p.data.category, rating: p.data.rating, body: p.data.body, priority: p.data.category === "Bug report" ? "High" : "Medium", context: { page: p.data.page ?? null, ua: null } });
  if (error) return { error: "We couldn't send that. Try again." };
  const badges = await checkAchievements(v.userId);
  revalidatePath("/feedback");
  return { badges };
}
