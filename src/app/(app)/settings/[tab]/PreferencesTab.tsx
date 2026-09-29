"use client";
import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChipGroup } from "@/components/ui/Chip";
import { LANGUAGES } from "@/lib/domain/catalog";
import { applyTheme, type ThemePref } from "@/lib/theme";
import { updatePreferencesAction, type SettingsState } from "../actions";
import { Msg } from "./bits";

export function PreferencesTab({ theme, language }: { theme: ThemePref; language: string }) {
  const [t, setT] = useState<ThemePref>(theme);
  const [lang, setLang] = useState(language);
  const [msg, setMsg] = useState<SettingsState>(null);
  const [, start] = useTransition();
  const save = (nt: ThemePref, nl: string) => start(async () => setMsg(await updatePreferencesAction(nt, nl)));
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="Theme" sub="System follows your device's light or dark setting." />
        <ChipGroup
          label="Theme"
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          value={t}
          onChange={(v) => {
            setT(v);
            applyTheme(v);
            save(v, lang);
          }}
        />
      </Card>
      <Card>
        <CardHeader title="Language" sub="Menus and Pip's answers (lessons, tutor, papers and feedback) use this language." />
        <ChipGroup
          label="Language"
          options={LANGUAGES.map((l) => ({ value: l.code as string, label: l.label }))}
          value={lang}
          onChange={(v) => {
            setLang(v);
            save(t, v);
          }}
        />
      </Card>
      <Msg state={msg} />
    </div>
  );
}
