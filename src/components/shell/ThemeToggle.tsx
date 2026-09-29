"use client";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { applyTheme } from "@/lib/theme";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}
const isDark = () => document.documentElement.dataset.theme === "dark";

/** One tap flips light/dark (stores an explicit preference). */
export function ThemeToggle({ label = "Switch light or dark mode", onChange }: { label?: string; onChange?: (theme: "light" | "dark") => void }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={label}
      title={label}
      onClick={() => {
        const next = isDark() ? "light" : "dark";
        applyTheme(next);
        onChange?.(next);
      }}
    >
      {dark ? <Sun size={19} aria-hidden /> : <Moon size={19} aria-hidden />}
    </button>
  );
}
