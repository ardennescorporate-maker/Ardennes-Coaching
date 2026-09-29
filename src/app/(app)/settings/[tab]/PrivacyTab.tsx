"use client";
import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import type { Profile } from "@/lib/viewer";
import { updatePrivacyAction, type SettingsState } from "../actions";
import { Msg, Row } from "./bits";

type Privacy = Profile["privacy"];

export function PrivacyTab({ privacy: initial }: { privacy: Privacy }) {
  const [p, setP] = useState<Privacy>(initial);
  const [msg, setMsg] = useState<SettingsState>(null);
  const [, start] = useTransition();
  const set = <K extends keyof Privacy>(k: K, v: Privacy[K]) => {
    const next = { ...p, [k]: v };
    setP(next);
    start(async () => setMsg(await updatePrivacyAction(next)));
  };
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="Your profile" sub="Other students can only ever see your username, avatar, level, badges and streak. Never your email." />
        <Row title="Public profile" hint="Let group members open your profile">
          <Toggle label="Public profile" checked={p.publicProfile} onChange={(v) => set("publicProfile", v)} />
        </Row>
        <Row title="Show me on leaderboards" hint='When off, you appear as "hidden" to others'>
          <Toggle label="Show me on leaderboards" checked={p.showOnLeaderboards} onChange={(v) => set("showOnLeaderboards", v)} />
        </Row>
      </Card>
      <Card>
        <CardHeader title="Who can see my study activity" />
        <select className="field max-w-sm" value={p.activity} onChange={(e) => set("activity", e.target.value as Privacy["activity"])}>
          <option value="everyone">Everyone in my groups</option>
          <option value="friends">Friends only</option>
          <option value="me">Only me</option>
        </select>
      </Card>
      <Card>
        <CardHeader title="Who can add me as a friend" />
        <select className="field max-w-sm" value={p.friendRequests} onChange={(e) => set("friendRequests", e.target.value as Privacy["friendRequests"])}>
          <option value="everyone">Everyone</option>
          <option value="fof">Friends of friends</option>
          <option value="nobody">Nobody</option>
        </select>
      </Card>
      <Msg state={msg} />
    </div>
  );
}
