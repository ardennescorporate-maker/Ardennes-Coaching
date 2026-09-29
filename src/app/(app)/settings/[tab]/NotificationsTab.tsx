"use client";
import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChipGroup } from "@/components/ui/Chip";
import { Toggle } from "@/components/ui/Toggle";
import type { Profile } from "@/lib/viewer";
import { enablePush, disablePush } from "@/lib/push-client";
import { updateNotificationPrefsAction, type SettingsState } from "../actions";
import { Msg, Row } from "./bits";

type Prefs = Profile["notif_prefs"];

export function NotificationsTab({ prefs: initial }: { prefs: Prefs }) {
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [msg, setMsg] = useState<SettingsState>(null);
  const [, start] = useTransition();
  const save = (next: Prefs) => {
    setPrefs(next);
    start(async () => setMsg(await updateNotificationPrefsAction(next)));
  };
  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => save({ ...prefs, [k]: v });

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="What Pip tells you about" />
        <Row title="Study reminders" hint="Planned sessions, streaks at risk and exam countdowns">
          <Toggle label="Study reminders" checked={prefs.study} onChange={(v) => set("study", v)} />
        </Row>
        <Row title="Motivation" hint="Daily messages, badges, level-ups and milestones">
          <Toggle label="Motivation" checked={prefs.motivation} onChange={(v) => set("motivation", v)} />
        </Row>
        <Row title="Competition" hint="Friends passing you, rank changes and group challenges">
          <Toggle label="Competition" checked={prefs.competition} onChange={(v) => set("competition", v)} />
        </Row>
        <Row title="AI insights" hint="Weak topics, revision ideas and marked papers">
          <Toggle label="AI insights" checked={prefs.ai} onChange={(v) => set("ai", v)} />
        </Row>
      </Card>
      <Card>
        <CardHeader title="When" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="label">Frequency</span>
            <ChipGroup
              label="Frequency"
              options={[
                { value: "low", label: "Low" },
                { value: "normal", label: "Normal" },
                { value: "high", label: "High" },
              ]}
              value={prefs.frequency}
              onChange={(v) => set("frequency", v)}
            />
          </div>
          <label className="block">
            <span className="label">Daily reminder time</span>
            <input type="time" className="field num" value={prefs.reminderTime} onChange={(e) => set("reminderTime", e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Quiet hours start</span>
            <input type="time" className="field num" value={prefs.quietStart} onChange={(e) => set("quietStart", e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Quiet hours end</span>
            <input type="time" className="field num" value={prefs.quietEnd} onChange={(e) => set("quietEnd", e.target.value)} />
          </label>
        </div>
      </Card>
      <Card>
        <CardHeader title="Where" />
        <Row title="In the app" hint="The bell in the top bar">
          <Toggle label="In-app notifications" checked={prefs.inApp} onChange={(v) => set("inApp", v)} />
        </Row>
        <Row title="Push notifications" hint="On this device, even when StudyPilot is closed">
          <Toggle
            label="Push notifications"
            checked={prefs.push}
            onChange={async (v) => {
              if (v) {
                const err = await enablePush();
                if (err) return setMsg({ error: err });
              } else await disablePush();
              set("push", v);
            }}
          />
        </Row>
        <Row title="Email" hint="A short summary to your inbox">
          <Toggle label="Email notifications" checked={prefs.email} onChange={(v) => set("email", v)} />
        </Row>
      </Card>
      <Msg state={msg} />
    </div>
  );
}
