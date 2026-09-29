/** Badges (spec §7). Seeded into public.achievements. */
export const ACHIEVEMENTS = [
  { id: "first_session", title: "First Study Session", description: "Log your first verified study session.", icon: "clock" },
  { id: "streak_7", title: "7 Day Streak", description: "Study seven days in a row.", icon: "flame" },
  { id: "questions_100", title: "100 Questions Completed", description: "Answer 100 questions across quizzes, lessons and papers.", icon: "check" },
  { id: "exam_champion", title: "Exam Champion", description: "Score 90% or more on a practice paper.", icon: "trophy" },
  { id: "hours_100", title: "100 Hours Studied", description: "Log 100 hours of study.", icon: "hourglass" },
  { id: "top_performer", title: "Top Performer", description: "Reach first place on a group leaderboard.", icon: "crown" },
  { id: "card_shark", title: "Card Shark", description: "Build a deck with 20 or more flashcards.", icon: "layers" },
  { id: "first_paper", title: "First Paper", description: "Complete a practice paper.", icon: "file" },
  { id: "cruising_altitude", title: "Cruising Altitude", description: "Reach Level 10.", icon: "plane" },
  { id: "beta_pioneer", title: "Beta Pioneer", description: "Joined StudyPilot during the private beta.", icon: "rocket", betaOnly: true },
  { id: "bug_hunter", title: "Bug Hunter", description: "Send your first beta feedback report.", icon: "bug", betaOnly: true },
] as const;
export type AchievementId = (typeof ACHIEVEMENTS)[number]["id"];
