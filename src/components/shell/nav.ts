import {
  BarChart3,
  BookOpen,
  CalendarDays,
  FileText,
  Gem,
  Home,
  Layers,
  MessageCircle,
  MessageSquareHeart,
  Settings,
  ShieldCheck,
  Timer,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { MessageKey } from "@/lib/i18n/messages";

export type NavItem = { href: string; key: MessageKey; icon: LucideIcon; admin?: boolean };

export const NAV: NavItem[] = [
  { href: "/home", key: "nav.home", icon: Home },
  { href: "/lessons", key: "nav.lessons", icon: BookOpen },
  { href: "/tutor", key: "nav.tutor", icon: MessageCircle },
  { href: "/papers", key: "nav.papers", icon: FileText },
  { href: "/flashcards", key: "nav.flashcards", icon: Layers },
  { href: "/planner", key: "nav.planner", icon: CalendarDays },
  { href: "/groups", key: "nav.groups", icon: Users },
  { href: "/progress", key: "nav.progress", icon: BarChart3 },
  { href: "/tools", key: "nav.tools", icon: Timer },
  { href: "/plans", key: "nav.plans", icon: Gem },
  { href: "/profile", key: "nav.profile", icon: User },
  { href: "/settings", key: "nav.settings", icon: Settings },
];

export const BETA_NAV: NavItem[] = [
  { href: "/feedback", key: "nav.feedback", icon: MessageSquareHeart },
  { href: "/admin", key: "nav.admin", icon: ShieldCheck, admin: true },
];

/** Page titles for the top bar, keyed by first path segment. */
export function navKeyFor(pathname: string): MessageKey | null {
  const seg = "/" + (pathname.split("/")[1] ?? "");
  return [...NAV, ...BETA_NAV].find((n) => n.href === seg)?.key ?? null;
}
