"use client";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { AVATAR_COLOURS, COUNTRIES, COUNTRY_LIST, SUBJECTS, YEAR_LEVELS, avatarInk, type Country } from "@/lib/domain/catalog";
import { checkUsernameAction } from "@/app/(auth)/actions";

export type ProfileDefaults = {
  username?: string;
  avatar?: string;
  year?: string;
  country?: string;
  system?: string;
  subjects?: string[];
  goal?: string;
};

/** Username, avatar, year, country → system, subjects and goal. Used in onboarding and settings. */
export function ProfileFields({ defaults = {}, errorField }: { defaults?: ProfileDefaults; errorField?: string }) {
  const [username, setUsername] = useState(defaults.username ?? "");
  const [check, setCheck] = useState<{ name: string; msg: string | null }>({ name: "", msg: null });
  const [avatar, setAvatar] = useState(defaults.avatar ?? AVATAR_COLOURS[0]);
  const [country, setCountry] = useState<Country>((defaults.country as Country) ?? "Australia");
  const [system, setSystem] = useState(defaults.system ?? COUNTRIES[(defaults.country as Country) ?? "Australia"][0]);
  const [subjects, setSubjects] = useState<string[]>(defaults.subjects ?? []);

  useEffect(() => {
    if (!username || username === defaults.username) return;
    const t = setTimeout(async () => setCheck({ name: username, msg: await checkUsernameAction(username) }), 400);
    return () => clearTimeout(t);
  }, [username, defaults.username]);
  const nameMsg = check.name === username ? check.msg : null;

  const toggle = (s: string) => setSubjects((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : [...xs, s]));

  return (
    <div className="flex flex-col gap-5">
      <label className="block">
        <span className="label">Username</span>
        <input
          name="username"
          required
          minLength={3}
          maxLength={20}
          pattern="[A-Za-z0-9._]{3,20}"
          autoComplete="username"
          className="field"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
          aria-invalid={errorField === "username" || Boolean(nameMsg)}
          aria-describedby="username-hint"
        />
        <span id="username-hint" className={`mt-1 block text-xs ${nameMsg ? "font-bold text-bad-ink" : "text-ink-3"}`}>
          {nameMsg ?? "3–20 characters: letters, numbers, dots and underscores."}
        </span>
      </label>

      <fieldset>
        <legend className="label">Avatar colour</legend>
        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Avatar colour">
          {AVATAR_COLOURS.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="avatar" value={c} checked={avatar === c} onChange={() => setAvatar(c)} className="peer sr-only" />
              <span
                className="grid h-11 w-11 place-items-center rounded-full border-[3px] border-transparent ring-blue peer-checked:border-surface peer-checked:ring-[3px] peer-focus-visible:ring-[3px]"
                style={{ background: c, color: avatarInk(c) }}
              >
                {avatar === c && <Check size={18} strokeWidth={3} aria-hidden />}
                <span className="sr-only">{c}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="label">Year level</span>
          <select name="year" required defaultValue={defaults.year ?? "Year 12"} className="field">
            {YEAR_LEVELS.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Country</span>
          <select
            name="country"
            required
            className="field"
            value={country}
            onChange={(e) => {
              const c = e.target.value as Country;
              setCountry(c);
              setSystem(COUNTRIES[c][0]);
            }}
          >
            {COUNTRY_LIST.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Education system</span>
          <select name="system" required className="field" value={system} onChange={(e) => setSystem(e.target.value)}>
            {COUNTRIES[country].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="label">
          Subjects <span className="font-semibold text-ink-3">(pick at least one)</span>
        </legend>
        <div className="flex flex-wrap gap-2" aria-invalid={errorField === "subjects"}>
          {SUBJECTS.map((s) => (
            <label key={s} className={`chip ${subjects.includes(s) ? "is-selected" : ""} has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-blue`}>
              <input type="checkbox" name="subjects" value={s} checked={subjects.includes(s)} onChange={() => toggle(s)} className="sr-only" />
              {s}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="label">Academic goal</span>
        <input name="goal" maxLength={120} defaultValue={defaults.goal ?? ""} placeholder='e.g. "ATAR 95+"' className="field" />
      </label>
    </div>
  );
}
