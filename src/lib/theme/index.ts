export type ThemePref = "system" | "light" | "dark";
export const THEME_KEY = "sp-theme";

/** Runs before paint (inlined in <head>) so the page never flashes the wrong theme. */
export const themeBootScript = `(function(){try{var p=localStorage.getItem("${THEME_KEY}")||(document.cookie.match(/(?:^|; )${THEME_KEY}=(\\w+)/)||[])[1]||"system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";document.documentElement.dataset.themePref=p;}catch(e){document.documentElement.dataset.theme="light";}})();`;

export function resolveTheme(pref: ThemePref): "light" | "dark" {
  if (pref === "system") {
    return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return pref;
}

/** Applies and persists a theme preference (local storage + cookie so the server knows too). */
export function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(pref);
  root.dataset.themePref = pref;
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {}
  document.cookie = `${THEME_KEY}=${pref}; path=/; max-age=31536000; samesite=lax`;
}
