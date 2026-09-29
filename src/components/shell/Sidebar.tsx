"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { levelProgress } from "@/lib/domain/levels";
import { translator } from "@/lib/i18n/messages";
import { XpBar } from "@/components/ui/XpBar";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";
import { BETA_NAV, NAV, type NavItem } from "./nav";
import type { ShellUser } from "./types";

export function Sidebar({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const t = translator(user.language);
  const lp = levelProgress(user.xp);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const item = (n: NavItem) => {
    const active = isActive(n.href);
    const Icon = n.icon;
    return (
      <li key={n.href}>
        <Link href={n.href} className="nav-item" aria-current={active ? "page" : undefined} title={t(n.key)}>
          <span className="nav-icon">
            <Icon size={18} strokeWidth={2.2} aria-hidden />
          </span>
          <span className={active ? "nav-label nav-label-active" : "nav-label"}>{t(n.key)}</span>
        </Link>
      </li>
    );
  };

  return (
    <aside className="sidebar" aria-label="Main">
      <div className="hidden px-2 pt-5 pb-4 min-[901px]:block">
        <Logo />
      </div>
      <nav className="sidebar-nav">
        <ul className="sidebar-list">
          {NAV.map(item)}
          <li className="sidebar-section micro px-2 pt-4 pb-1 text-ink-3" aria-hidden>
            {t("nav.beta")}
          </li>
          {BETA_NAV.filter((n) => !n.admin || user.isAdmin).map(item)}
        </ul>
      </nav>
      <div className="sidebar-footer mt-auto hidden border-t-2 border-line p-3 min-[901px]:block">
        <Link href="/profile" className="flex items-center gap-2.5 rounded-xl">
          <Avatar name={user.username} colour={user.avatarColour} url={user.avatarUrl} />
          <span className="min-w-0">
            <span className="block truncate font-extrabold">{user.username}</span>
            <span className="block text-xs text-ink-3">
              {t("shell.level")} {lp.level}
              {user.isBeta && <> · <span className="beta-tag">BETA</span></>}
            </span>
          </span>
        </Link>
        <XpBar className="mt-2.5" value={lp.into} max={lp.span} />
        <p className="num mt-1 text-[11px] text-ink-3">
          {lp.into.toLocaleString()} / {lp.span.toLocaleString()} XP {t("shell.toLevel")}
          {lp.level + 1}
        </p>
      </div>
    </aside>
  );
}
