"use client";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { T } from "@/lib/i18n/messages";
import { markAllNotificationsRead, markNotificationRead } from "@/app/(app)/actions";
import type { ShellNotification } from "./types";

const DOT: Record<ShellNotification["category"], string> = {
  study: "var(--blue)",
  motivation: "var(--yellow)",
  competition: "var(--bad)",
  ai: "var(--good)",
  beta: "var(--yellow-deep)",
};

export function NotificationBell({ initial, t }: { initial: ShellNotification[]; t: T }) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string> | "all">(new Set());
  const items = initial.map((n) => ({ ...n, read: n.read || readIds === "all" || readIds.has(n.id) }));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        aria-label={`${t("shell.notifications")}${unread ? ` (${unread} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={19} aria-hidden />
        {unread > 0 && (
          <span className="num absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#C4282D] px-1 text-[11px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label={t("shell.notifications")} className="card fixed inset-x-3 top-[124px] z-50 max-h-[70vh] overflow-hidden p-0 min-[901px]:absolute min-[901px]:inset-x-auto min-[901px]:right-0 min-[901px]:top-12 min-[901px]:w-[380px]">
          <div className="flex items-center justify-between border-b-2 border-line px-4 py-3">
            <h2 className="font-bold">{t("shell.notifications")}</h2>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={!unread}
              onClick={async () => {
                setReadIds("all");
                await markAllNotificationsRead();
              }}
            >
              {t("shell.markAllRead")}
            </button>
          </div>
          <ul className="max-h-[48vh] overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-ink-3">{t("shell.noNotifications")}</li>}
            {items.map((n) => {
              const body = (
                <>
                  <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full" style={{ background: DOT[n.category] }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${n.read ? "font-semibold text-ink-2" : "font-extrabold"}`}>{n.title}</span>
                    {n.body && <span className="block text-xs text-ink-3">{n.body}</span>}
                    <span className="block text-[11px] text-ink-3">{timeAgo(n.createdAt)}</span>
                  </span>
                </>
              );
              const onClick = () => {
                if (!n.read) {
                  setReadIds((s) => (s === "all" ? s : new Set(s).add(n.id)));
                  void markNotificationRead(n.id);
                }
                setOpen(false);
              };
              return (
                <li key={n.id} className="border-b border-line last:border-0">
                  {n.href ? (
                    <Link href={n.href} onClick={onClick} className="flex gap-3 px-4 py-3 hover:bg-surface-2">
                      {body}
                    </Link>
                  ) : (
                    <button type="button" onClick={onClick} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-surface-2">
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="border-t-2 border-line px-4 py-2.5">
            <Link href="/settings/notifications" className="text-sm font-extrabold text-blue-ink" onClick={() => setOpen(false)}>
              {t("shell.notifSettings")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
