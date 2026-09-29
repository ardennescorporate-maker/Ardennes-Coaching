import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import { AccountTab } from "./AccountTab";
import { ProfileTab } from "./ProfileTab";
import { PreferencesTab } from "./PreferencesTab";
import { NotificationsTab } from "./NotificationsTab";
import { PrivacyTab } from "./PrivacyTab";
import { SecurityTab } from "./SecurityTab";
import { SubscriptionTab } from "./SubscriptionTab";

const TABS = [
  ["account", "Account"],
  ["profile", "Profile"],
  ["preferences", "Preferences"],
  ["notifications", "Notifications"],
  ["privacy", "Privacy"],
  ["security", "Security"],
  ["subscription", "Subscription"],
] as const;

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsTab({ params }: PageProps<"/settings/[tab]">) {
  const { tab } = await params;
  if (!TABS.some(([k]) => k === tab)) notFound();
  const v = await requireViewer();
  const p = v.profile;

  let body: React.ReactNode = null;
  if (tab === "account") body = <AccountTab email={v.email} provider={v.provider} demo={p.is_demo} />;
  if (tab === "profile")
    body = <ProfileTab defaults={{ username: p.username ?? "", avatar: p.avatar_colour, year: p.year_level ?? undefined, country: p.country ?? undefined, system: p.system ?? undefined, subjects: p.subjects, goal: p.goal ?? "" }} />;
  if (tab === "preferences") body = <PreferencesTab theme={p.theme} language={p.language} />;
  if (tab === "notifications") body = <NotificationsTab prefs={p.notif_prefs} />;
  if (tab === "privacy") body = <PrivacyTab privacy={p.privacy} />;
  if (tab === "security") {
    const supabase = await createClient();
    const { data } = await supabase.from("login_history").select("at, method, device, ip").order("at", { ascending: false }).limit(20);
    body = <SecurityTab history={data ?? []} tz={p.timezone} />;
  }
  if (tab === "subscription") {
    const supabase = await createClient();
    const { data: code } = p.beta_code_id ? await supabase.from("beta_codes").select("code").eq("id", p.beta_code_id).maybeSingle() : { data: null };
    body = <SubscriptionTab isBeta={v.isBeta} code={code?.code ?? null} launchPlan={p.launch_plan} joined={p.beta_joined_at} />;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[200px_1fr]">
      <nav aria-label="Settings sections" className="scroll-x -mx-4 px-4 lg:mx-0 lg:px-0">
        <ul className="flex gap-2 lg:flex-col lg:gap-1">
          {TABS.map(([k, label]) => (
            <li key={k}>
              <Link
                href={`/settings/${k}`}
                aria-current={k === tab ? "page" : undefined}
                className={`block whitespace-nowrap rounded-xl px-3 py-2 font-extrabold ${k === tab ? "bg-blue text-white" : "text-ink-2 hover:bg-surface-2"}`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">{body}</div>
    </div>
  );
}
