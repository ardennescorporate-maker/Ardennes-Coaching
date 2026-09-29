export const TUTOR_MODES = ["Explain", "Step-by-step", "Check my working", "Give examples", "Study strategy"] as const;
export const TUTOR_LEVELS = ["Simpler", "Standard", "Advanced"] as const;
export type TutorMode = (typeof TUTOR_MODES)[number];
export type TutorLevel = (typeof TUTOR_LEVELS)[number];

export const STARTERS: Record<TutorMode, string[]> = {
  Explain: ["Explain this topic like I'm new to it", "What's the difference between these two ideas?", "Why does this rule work?"],
  "Step-by-step": ["Solve this question step by step:", "Walk me through a typical exam question on this topic"],
  "Check my working": ["Here's my working. Where did I go wrong?\n\n"],
  "Give examples": ["Give me 3 practice questions with answers", "Show me a real-world example of this"],
  "Study strategy": ["How should I revise for my exam in 2 weeks?", "What do markers look for in long responses?"],
};
