"use client";
import { Flame, Zap } from "lucide-react";
import { usePathname } from "next/navigation";
import { translator } from "@/lib/i18n/messages";
import { saveThemePreference } from "@/app/(app)/actions";
import { navKeyFor } from "./nav";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import type { ShellNotification, ShellUser } from "./types";

export function TopBar({ user, notifications }: { user: ShellUser; notifications: ShellNotification[] }) {
  const pathname = usePathname();
  const t = translator(user.language);
  const key = navKeyFor(pathname);
  return (
    <header className="topbar">
      <h1 className="font-display min-w-0 flex-1 truncate text-xl font-extrabold sm:text-2xl">{key ? t(key) : "StudyPilot"}</h1>
      <ThemeToggle label={t("shell.theme")} onChange={(v) => void saveThemePreference(v)} />
      <span className="pill pill-yellow num h-[34px] px-3 text-sm" title="Total XP">
        <Zap size={15} fill="currentColor" aria-hidden />
        {user.xp.toLocaleString()}
        <span className="sr-only">XP</span>
      </span>
      <span
        className={`pill num h-[34px] px-3 text-sm ${user.studiedToday ? "pill-good" : user.streak > 0 ? "pill-warn" : "pill-muted"}`}
        title={user.studiedToday ? "Studied today" : user.streak > 0 ? "Streak at risk: study today" : "Start a streak today"}
      >
        <Flame size={15} fill="currentColor" aria-hidden />
        {user.streak}
        <span className="sr-only"> {t("shell.streak")}</span>
      </span>
      <NotificationBell initial={notifications} t={t} />
    </header>
  );
}
