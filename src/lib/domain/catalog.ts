export const COUNTRIES = {
  Australia: ["NSW HSC", "VIC VCE", "QLD QCE", "WA WACE", "SA SACE"],
  "United States": ["SAT", "ACT", "AP Exams"],
  "United Kingdom": ["GCSE", "A-Level"],
  International: ["IB Diploma"],
  Other: ["General"],
} as const;
export type Country = keyof typeof COUNTRIES;
export const COUNTRY_LIST = Object.keys(COUNTRIES) as Country[];

export const EXAM_SYSTEMS = ["NSW HSC", "VIC VCE", "QLD QCE", "WA WACE", "SA SACE", "SAT", "ACT", "AP Exams", "GCSE", "A-Level", "IB Diploma"] as const;

export const YEAR_LEVELS = ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "University"] as const;

export const SUBJECTS = [
  "Mathematics Advanced",
  "Mathematics Extension 1",
  "Mathematics Extension 2",
  "English Advanced",
  "English Standard",
  "Biology",
  "Chemistry",
  "Physics",
  "Business Studies",
  "Economics",
  "Legal Studies",
  "Modern History",
  "Geography",
  "SAT Math",
  "SAT Reading & Writing",
  "AP Calculus AB",
  "AP Biology",
  "GCSE Maths",
  "A-Level Chemistry",
  "IB Mathematics AA",
] as const;
export type Subject = (typeof SUBJECTS)[number];

/** 8 avatar colours: shades of blue, navy and yellow only. */
export const AVATAR_COLOURS = ["#2F7BF5", "#1B5CCB", "#5FA0FF", "#17307A", "#0E1F55", "#FFC226", "#E0A100", "#8EC0FF"] as const;

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "zh", label: "中文" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "hi", label: "हिन्दी" },
] as const;
export type Lang = (typeof LANGUAGES)[number]["code"];
export const LANGUAGE_NAMES: Record<Lang, string> = { en: "English", es: "Spanish", zh: "Simplified Chinese", vi: "Vietnamese", hi: "Hindi" };

/** Text colour that reads on an avatar colour. */
export function avatarInk(colour: string) {
  return ["#FFC226", "#E0A100", "#8EC0FF", "#5FA0FF"].includes(colour.toUpperCase()) ? "#0F1E3D" : "#FFFFFF";
}
