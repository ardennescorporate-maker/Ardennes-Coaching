import type { Lang } from "@/lib/domain/catalog";

/** What the app shell needs to know about the signed-in user. */
export type ShellUser = {
  username: string;
  avatarColour: string;
  avatarUrl?: string | null;
  xp: number;
  streak: number;
  studiedToday: boolean;
  isBeta: boolean;
  isAdmin: boolean;
  language: Lang;
};

export type ShellNotification = {
  id: string;
  category: "study" | "motivation" | "competition" | "ai" | "beta";
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};
