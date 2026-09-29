import { requireViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import { translator } from "@/lib/i18n/messages";
import { displayStreak, streakStatus } from "@/lib/domain/streak";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { BetaBanner } from "@/components/shell/BetaBanner";
import { AskPipButton } from "@/components/shell/AskPipButton";
import { ToastProvider } from "@/components/ui/Toast";
import { RewardsProvider } from "@/components/rewards/Rewards";
import { ThemeSync } from "@/components/shell/ThemeSync";
import { VisitTracker } from "@/components/shell/VisitTracker";
import { RememberAccount } from "@/components/shell/RememberAccount";
import type { ShellNotification, ShellUser } from "@/components/shell/types";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const v = await requireViewer();
  const p = v.profile;
  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("notifications")
    .select("id, category, title, body, href, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(25);

  const streakState = { streak: p.streak, lastStudyDate: p.last_study_date };
  const user: ShellUser = {
    username: p.username ?? "student",
    avatarColour: p.avatar_colour,
    avatarUrl: p.avatar_url,
    xp: p.xp,
    streak: displayStreak(streakState, v.today),
    studiedToday: streakStatus(streakState, v.today) === "studied",
    isBeta: v.isBeta,
    isAdmin: v.isAdmin,
    language: p.language,
  };
  const notifications: ShellNotification[] = (notes ?? []).map((n) => ({
    id: n.id,
    category: n.category,
    title: n.title,
    body: n.body,
    href: n.href,
    read: Boolean(n.read_at),
    createdAt: n.created_at,
  }));
  const t = translator(p.language);

  return (
    <ToastProvider>
      <RewardsProvider>
      <a href="#main" className="sr-only-focusable fixed left-3 top-3 z-[70] rounded-xl bg-blue-fill px-4 py-2 font-extrabold text-white">
        {t("shell.skip")}
      </a>
      <ThemeSync pref={p.theme} />
      <VisitTracker />
      <RememberAccount email={v.email} username={user.username} avatarColour={user.avatarColour} demo={p.is_demo} />
      <div className="shell">
        <Sidebar user={user} />
        <div className="shell-main">
          <TopBar user={user} notifications={notifications} />
          <BetaBanner t={t} />
          <main id="main" className="content" lang={p.language}>
            {children}
          </main>
        </div>
      </div>
      <AskPipButton label={t("shell.askPip")} />
      </RewardsProvider>
    </ToastProvider>
  );
}
