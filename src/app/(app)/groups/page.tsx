import type { Metadata } from "next";
import { requireViewer } from "@/lib/viewer";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { leaderboard, myGroups } from "@/lib/server/queries";
import { startOfWeek, addDays } from "@/lib/domain/dates";
import { GroupsClient } from "./GroupsClient";

export const metadata: Metadata = { title: "Groups" };

export default async function GroupsPage({ searchParams }: PageProps<"/groups">) {
  const v = await requireViewer();
  const sp = await searchParams;
  const groups = await myGroups();
  const group = groups.find((g) => g.id === sp.g) ?? groups[0] ?? null;
  if (!group) return <GroupsClient groups={[]} group={null} week={[]} all={[]} announcements={[]} challenge={null} goalHours={0} weekHours={0} viewerId={v.userId} />;

  const [week, all] = await Promise.all([leaderboard(group.id, "week", v), leaderboard(group.id, "all", v)]);
  const supabase = await createClient();
  const { data: ann } = await supabase.from("group_announcements").select("id, body, created_at, user_id").eq("group_id", group.id).order("created_at", { ascending: false }).limit(30);
  const authorIds = [...new Set((ann ?? []).map((a) => a.user_id).filter(Boolean))] as string[];
  const { data: authors } = authorIds.length ? await adminClient().from("public_profiles").select("id, username, avatar_colour").in("id", authorIds) : { data: [] };
  const monday = startOfWeek(v.today);
  const weekMinutes = week.reduce((a, r) => a + r.weekMinutes, 0);
  const topPapers = [...week].sort((a, b) => b.weekPapers - a.weekPapers)[0];
  return (
    <GroupsClient
      groups={groups.map((g) => ({ id: g.id, name: g.name }))}
      group={group}
      week={week}
      all={all}
      announcements={(ann ?? []).map((a) => {
        const au = authors?.find((x) => x.id === a.user_id);
        return { id: a.id, body: a.body, createdAt: a.created_at, author: au?.username ?? (a.user_id ? "Student" : "StudyPilot"), colour: au?.avatar_colour ?? "#17307A", mine: a.user_id === v.userId };
      })}
      challenge={{ title: "Most practice papers this week", endsOn: addDays(monday, 6), leader: topPapers && topPapers.weekPapers > 0 ? { name: topPapers.username, papers: topPapers.weekPapers, isYou: topPapers.isYou } : null }}
      goalHours={group.goal_hours}
      weekHours={Math.round((weekMinutes / 60) * 10) / 10}
      viewerId={v.userId}
    />
  );
}
