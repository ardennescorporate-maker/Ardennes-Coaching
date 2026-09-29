import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { addDays, dayKey } from "@/lib/domain/dates";
import { SAMPLE_CONFIG, SAMPLE_PAPER } from "@/lib/content/samplePaper";
import { allQuestions, pctOf } from "@/lib/domain/paper";
import { predictedResult } from "@/lib/domain/bands";

export const DEMO_EMAIL = "demo@studypilot.dev";
const DEMO_GROUP_CODE = "MATHS-12B";

/** Creates (or returns) the demo account and reseeds its data once a day. Dev/beta only. */
export async function ensureDemo(): Promise<string> {
  const db = adminClient();
  const today = dayKey();

  const { data: existing } = await db.from("profiles").select("id").eq("email", DEMO_EMAIL).maybeSingle();
  let userId = existing?.id as string | undefined;
  if (!userId) {
    const { data, error } = await db.auth.admin.createUser({ email: DEMO_EMAIL, email_confirm: true, app_metadata: { demo: true } });
    if (error || !data.user) throw new Error(`demo user: ${error?.message}`);
    userId = data.user.id;
  }
  const { data: u } = await db.auth.admin.getUserById(userId);
  if (u.user?.app_metadata?.seeded_on === today) return userId;

  await seedDemoData(userId, today);
  await db.auth.admin.updateUserById(userId, { app_metadata: { demo: true, seeded_on: today } });
  return userId;
}

async function seedDemoData(uid: string, today: string) {
  const db = adminClient();
  const must = async <T>(p: PromiseLike<{ error: { message: string } | null; data?: T | null }>, what: string) => {
    const r = await p;
    if (r.error) throw new Error(`demo seed ${what}: ${r.error.message}`);
    return r.data as T;
  };

  // Wipe previous demo data.
  for (const t of ["xp_events", "study_sessions", "exams", "homework", "papers", "weak_topics", "decks", "notes", "notifications", "lesson_progress", "user_achievements", "tutor_chats", "feedback", "revision_timelines"]) {
    await must(db.from(t).delete().eq("user_id", uid), `wipe ${t}`);
  }

  // Beta code for the demo (not counted against real codes).
  const { data: code } = await db.from("beta_codes").upsert({ code: "DEMO-PILOT", max_uses: 500, active: true }, { onConflict: "code" }).select("id").single();

  // ~18 days of study over the last 3 weeks, the last 6 consecutive → 6-day streak.
  const studyDays = [-20, -19, -17, -16, -15, -13, -12, -11, -10, -8, -7, -6, -5, -4, -3, -2, -1, 0].map((d) => addDays(today, d));
  // Break the chain before the final 6 days: skip day -7? Keep −6…−1 and today unstudied = streak 6 at risk.
  const days = studyDays.filter((d) => d !== addDays(today, -7) && d !== today);
  const subjects = ["Mathematics Advanced", "Chemistry", "English Advanced", "Economics"];
  const sessions = days.map((day, i) => ({
    user_id: uid,
    subject: subjects[i % 4],
    minutes: [45, 60, 30, 50, 40, 75][i % 6],
    kind: i % 3 === 0 ? "focus" : "evidence",
    verified: true,
    day,
    created_at: `${day}T07:30:00Z`,
  }));
  await must(db.from("study_sessions").insert(sessions), "sessions");
  const minutes = sessions.reduce((a, s) => a + s.minutes, 0);

  const xpEvents = sessions.map((s) => ({ user_id: uid, amount: s.minutes, reason: s.kind === "focus" ? "focus" : "study_session", day: s.day, created_at: s.created_at }));
  xpEvents.push(
    { user_id: uid, amount: 88, reason: "paper", day: addDays(today, -12), created_at: `${addDays(today, -12)}T08:00:00Z` },
    { user_id: uid, amount: 75, reason: "paper", day: addDays(today, -8), created_at: `${addDays(today, -8)}T08:00:00Z` },
    { user_id: uid, amount: 81, reason: "paper", day: addDays(today, -4), created_at: `${addDays(today, -4)}T08:00:00Z` },
    { user_id: uid, amount: 94, reason: "paper", day: addDays(today, -2), created_at: `${addDays(today, -2)}T08:00:00Z` },
    { user_id: uid, amount: 50, reason: "lesson", day: addDays(today, -3), created_at: `${addDays(today, -3)}T09:00:00Z` },
    { user_id: uid, amount: 45, reason: "lesson", day: addDays(today, -1), created_at: `${addDays(today, -1)}T09:00:00Z` },
    { user_id: uid, amount: 24, reason: "flashcards", day: addDays(today, -1), created_at: `${addDays(today, -1)}T10:00:00Z` },
  );
  await must(db.from("xp_events").insert(xpEvents), "xp");
  const xp = xpEvents.reduce((a, e) => a + e.amount, 0) + 420; // plus history before the window

  await must(
    db
      .from("profiles")
      .update({
        username: "alex.r",
        avatar_colour: "#2F7BF5",
        year_level: "Year 12",
        country: "Australia",
        system: "NSW HSC",
        subjects,
        goal: "ATAR 95+",
        xp,
        streak: 6,
        last_study_date: addDays(today, -1),
        study_minutes: minutes + 600,
        questions_answered: 64,
        papers_completed: 4,
        beta_code_id: code?.id ?? null,
        beta_joined_at: new Date(Date.now() - 30 * 86400_000).toISOString(),
        beta_removed_at: null,
        plan: "premium_exam",
        is_demo: true,
        onboarded_at: new Date(Date.now() - 30 * 86400_000).toISOString(),
      })
      .eq("id", uid),
    "profile",
  );

  await must(
    db.from("exams").insert([
      { user_id: uid, name: "Maths Advanced trial", subject: "Mathematics Advanced", date: addDays(today, 5) },
      { user_id: uid, name: "Chemistry trial", subject: "Chemistry", date: addDays(today, 12) },
      { user_id: uid, name: "English Advanced Paper 1", subject: "English Advanced", date: addDays(today, 19) },
      { user_id: uid, name: "Economics trial", subject: "Economics", date: addDays(today, 26) },
    ]),
    "exams",
  );

  await must(
    db.from("homework").insert([
      { user_id: uid, task: "Calculus exercise 7C, Q1–15", subject: "Mathematics Advanced", due: addDays(today, 1) },
      { user_id: uid, task: "Titration prac write-up", subject: "Chemistry", due: today },
      { user_id: uid, task: "Module A essay plan", subject: "English Advanced", due: addDays(today, 4) },
      { user_id: uid, task: "Read chapter on exchange rates", subject: "Economics", due: addDays(today, -1), done_at: new Date().toISOString() },
    ]),
    "homework",
  );

  // Four past papers (sample paper with different marks).
  const qs = allQuestions(SAMPLE_PAPER);
  const scoresets = [
    [1, 1, 0, 2, 1],
    [1, 0, 1, 1, 1],
    [1, 1, 1, 2, 1],
    [1, 1, 1, 3, 2],
  ];
  const paperDays = [-12, -8, -4, -2];
  const papers = scoresets.map((set, i) => {
    const questions = qs.map((q, j) => ({ id: q.id, awarded: set[j], max: q.marks, topic: q.topic, feedback: set[j] === q.marks ? "Full marks. Clear working." : "Partly correct. Check the marking guideline." }));
    const score = set.reduce((a, b) => a + b, 0);
    const max = 8;
    const pct = pctOf(score, max);
    const band = predictedResult(pct, "NSW HSC");
    const at = `${addDays(today, paperDays[i])}T08:00:00Z`;
    return {
      user_id: uid,
      config: SAMPLE_CONFIG,
      paper: SAMPLE_PAPER,
      answers: {},
      result: {
        questions,
        score,
        max,
        pct,
        band,
        strengths: ["Accurate differentiation", "Clear setting out"],
        improvements: ["Justify the nature of stationary points", "Round only at the final step"],
        weakTopics: pct < 80 ? ["Logarithm laws"] : [],
        exemplar: qs[3].sample,
      },
      score,
      max_score: max,
      pct,
      band,
      status: "marked",
      is_sample: true,
      started_at: at,
      submitted_at: at,
      created_at: at,
    };
  });
  await must(db.from("papers").insert(papers), "papers");

  await must(
    db.from("weak_topics").insert([
      { user_id: uid, subject: "Mathematics Advanced", topic: "Logarithm laws", misses: 4 },
      { user_id: uid, subject: "Chemistry", topic: "The equilibrium constant (Keq)", misses: 3 },
      { user_id: uid, subject: "Mathematics Advanced", topic: "Stationary points and curve sketching", misses: 2 },
      { user_id: uid, subject: "Economics", topic: "Exchange rates", misses: 1 },
    ]),
    "weak topics",
  );

  const decks = await must<{ id: string; name: string }[]>(
    db
      .from("decks")
      .insert([
        { user_id: uid, name: "Calculus rules", subject: "Mathematics Advanced" },
        { user_id: uid, name: "Equilibrium key terms", subject: "Chemistry" },
      ])
      .select("id, name"),
    "decks",
  );
  const calc = decks.find((d) => d.name === "Calculus rules")!.id;
  const chem = decks.find((d) => d.name === "Equilibrium key terms")!.id;
  const card = (deck: string, q: string, a: string, box: number, dueIn: number) => ({ deck_id: deck, user_id: uid, q, a, box, due: addDays(today, dueIn) });
  await must(
    db.from("cards").insert([
      card(calc, "d/dx of xⁿ", "n·xⁿ⁻¹ (the power rule)", 3, 0),
      card(calc, "d/dx of eˣ", "eˣ", 4, 5),
      card(calc, "d/dx of ln x", "1/x, for x > 0", 2, 0),
      card(calc, "Product rule", "(uv)′ = u′v + uv′", 2, 0),
      card(calc, "Quotient rule", "(u/v)′ = (u′v − uv′)/v²", 1, 0),
      card(calc, "Chain rule", "dy/dx = dy/du × du/dx", 3, 2),
      card(calc, "Stationary point test", "f′(x) = 0; f″ > 0 minimum, f″ < 0 maximum", 1, 0),
      card(calc, "∫ xⁿ dx", "xⁿ⁺¹/(n+1) + C, n ≠ −1", 5, 20),
      card(chem, "Dynamic equilibrium", "Forward and reverse reactions occur at equal rates, so concentrations stay constant.", 3, 1),
      card(chem, "Le Chatelier's principle", "A system at equilibrium shifts to partially oppose a change.", 2, 0),
      card(chem, "Keq expression", "[products]^coefficients ÷ [reactants]^coefficients (aqueous and gases only)", 1, 0),
      card(chem, "Effect of a catalyst", "Speeds up both directions equally; equilibrium position unchanged.", 4, 6),
      card(chem, "Closed system", "Matter cannot enter or leave; energy can.", 5, 25),
    ]),
    "cards",
  );

  await must(
    db.from("notes").insert({
      user_id: uid,
      title: "Log laws cheat sheet",
      subject: "Mathematics Advanced",
      body: "log(ab) = log a + log b\nlog(a/b) = log a − log b\nlog(aⁿ) = n log a\nlog_a a = 1, log_a 1 = 0\nChange of base: log_a x = ln x / ln a",
    }),
    "note",
  );

  // Lesson progress: first 5 Maths Advanced lessons and first 2 Chemistry lessons done.
  const { data: lessons } = await db.from("lessons").select("id, course_id, seq, courses!inner(subject)").in("courses.subject", ["Mathematics Advanced", "Chemistry"]).order("seq");
  const lp = (lessons ?? [])
    .filter((l: { seq: number; courses: { subject: string } | { subject: string }[] }) => {
      const subj = Array.isArray(l.courses) ? l.courses[0].subject : l.courses.subject;
      return subj === "Mathematics Advanced" ? l.seq < 5 : l.seq < 2;
    })
    .map((l: { id: string; course_id: string; seq: number }) => ({
      user_id: uid,
      lesson_id: l.id,
      course_id: l.course_id,
      stars: l.seq % 3 === 1 ? 2 : 3,
      best_score: l.seq % 3 === 1 ? 3 : 4,
      attempts: 1,
      completed_at: new Date(Date.now() - (10 - l.seq) * 86400_000).toISOString(),
    }));
  if (lp.length) await must(db.from("lesson_progress").insert(lp), "lesson progress");

  for (const a of ["beta_pioneer", "first_session", "first_paper", "exam_champion"]) {
    await must(db.from("user_achievements").insert({ user_id: uid, achievement_id: a }), `achievement ${a}`);
  }

  const n = (category: string, title: string, body: string | null, href: string | null, hoursAgo: number, read = false) => ({
    user_id: uid,
    category,
    title,
    body,
    href,
    created_at: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
    read_at: read ? new Date().toISOString() : null,
  });
  await must(
    db.from("notifications").insert([
      n("study", "Your 6-day streak is at risk", "One session today keeps it alive.", "/home", 1),
      n("study", "Maths Advanced trial is 5 days away", "A timed practice paper would help most.", "/papers", 3),
      n("competition", "mia.k is 120 XP ahead of you", "Catch up with a quick lesson.", "/groups", 6),
      n("ai", "Weak topic spotted: Logarithm laws", "Ask Pip for a step-by-step explanation.", "/tutor", 20),
      n("motivation", "Badge unlocked: Exam Champion", "You scored 90%+ on a practice paper.", "/profile", 48, true),
      n("beta", "Welcome to the StudyPilot beta!", "Every feature is unlocked and free.", "/feedback", 700, true),
    ]),
    "notifications",
  );

  await seedDemoGroup(uid, today);
}

async function seedDemoGroup(uid: string, today: string) {
  const db = adminClient();
  let { data: group } = await db.from("groups").select("id").eq("code", DEMO_GROUP_CODE).maybeSingle();
  if (!group) {
    const res = await db.from("groups").insert({ name: "Year 12 Maths Crew", type: "Class group", code: DEMO_GROUP_CODE, goal_hours: 40, is_demo: true, created_by: uid }).select("id").single();
    group = res.data;
  }
  if (!group) return;
  await db.from("group_members").upsert({ group_id: group.id, user_id: uid, role: "owner" }, { onConflict: "group_id,user_id" });
  await db.from("demo_students").delete().eq("group_id", group.id);
  await db.from("demo_students").insert(
    [
      ["mia.k", "#17307A", 3120, 540, 12, 610, 3],
      ["jordan_t", "#FFC226", 2780, 380, 4, 420, 2],
      ["priya.s", "#5FA0FF", 2410, 310, 9, 360, 1],
      ["ben.w", "#1B5CCB", 1980, 205, 2, 250, 1],
      ["chloe.n", "#E0A100", 1650, 160, 0, 190, 0],
    ].map(([username, avatar_colour, xp, week_xp, streak, week_minutes, week_papers]) => ({ group_id: group!.id, username, avatar_colour, xp, week_xp, streak, week_minutes, week_papers })),
  );
  await db.from("group_announcements").delete().eq("group_id", group.id);
  await db.from("group_announcements").insert([
    { group_id: group.id, user_id: uid, body: "Trial is next week! Let's all do one timed paper before Friday 💪", created_at: new Date(Date.now() - 26 * 3600_000).toISOString() },
    { group_id: group.id, user_id: null, body: "New challenge: most practice papers this week wins 200 XP.", created_at: new Date(Date.now() - 50 * 3600_000).toISOString() },
  ]);
  void today;
}
