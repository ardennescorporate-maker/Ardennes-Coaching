/** Lightweight profanity filter for group announcements (teen audience). */
const BLOCKED = [
  "fuck", "fucking", "shit", "bitch", "cunt", "dick", "piss", "bastard", "asshole", "arsehole", "slut", "whore", "fag", "faggot",
  "retard", "nigger", "nigga", "wanker", "twat", "prick", "douche", "motherfucker", "bullshit",
];

// Undo common character swaps (f*ck, sh1t, @ss) before matching whole words.
function normalise(s: string) {
  return s
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/7/g, "t")
    .replace(/[_.\-]/g, "");
}

export function containsProfanity(text: string): boolean {
  const words = normalise(text).split(/[^a-z*]+/).filter(Boolean);
  return words.some((w) => {
    // "*" masks a letter (f*ck, sh*t).
    if (w.includes("*")) {
      const re = new RegExp(`^${w.replace(/\*+/g, "[a-z]{1,2}")}$`);
      return BLOCKED.some((b) => re.test(b));
    }
    return BLOCKED.includes(w) || BLOCKED.some((b) => b.length >= 5 && w.includes(b));
  });
}

export const ANNOUNCEMENT_MAX = 500;

export function checkAnnouncement(body: string): string | null {
  const t = body.trim();
  if (!t) return "Write something first.";
  if (t.length > ANNOUNCEMENT_MAX) return `Keep announcements under ${ANNOUNCEMENT_MAX} characters.`;
  if (containsProfanity(t)) return "Please keep it friendly. That message has language we don't allow.";
  if (/(https?:\/\/|www\.)/i.test(t)) return "Links aren't allowed in group announcements.";
  return null;
}
