export type TipInput = {
  streak: number;
  streakAtRisk: boolean;
  nextExam?: { name: string; daysLeft: number } | null;
  topWeakTopic?: string | null;
  cardsDue: number;
};

/** Pip's home tip (spec §3): first match wins. */
export function pipTip(i: TipInput): string {
  if (i.streakAtRisk && i.streak > 0) return `Your ${i.streak}-day streak needs one session today. Let's take off!`;
  if (i.nextExam && i.nextExam.daysLeft >= 0 && i.nextExam.daysLeft <= 10)
    return `${i.nextExam.name} is ${i.nextExam.daysLeft} ${i.nextExam.daysLeft === 1 ? "day" : "days"} away. A timed practice paper would help most.`;
  if (i.topWeakTopic) return `Want to fix ${i.topWeakTopic}? Ask me and I'll explain it step by step.`;
  if (i.cardsDue > 0) return `${i.cardsDue} flashcards are ready for review. Quick five minutes?`;
  return "Ready when you are. Ask me anything about your subjects.";
}
