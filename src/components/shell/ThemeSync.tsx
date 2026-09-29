"use client";
import { useEffect } from "react";
import { THEME_KEY, applyTheme, type ThemePref } from "@/lib/theme";

/** Applies the theme saved on the user's profile (it wins over this device's last choice). */
export function ThemeSync({ pref }: { pref: ThemePref }) {
  useEffect(() => {
    let local: string | null = null;
    try {
      local = localStorage.getItem(THEME_KEY);
    } catch {}
    if (local !== pref) applyTheme(pref);
    if (pref !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => applyTheme("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [pref]);
  return null;
}
