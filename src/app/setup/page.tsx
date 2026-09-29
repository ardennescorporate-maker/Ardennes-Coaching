import { Pip } from "@/components/pip/Pip";
import { supabaseConfigured } from "@/lib/supabase/env";
import { redirect } from "next/navigation";

export default function Setup() {
  if (supabaseConfigured) redirect("/login");
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <Pip mood="think" size={140} animation="tilt" />
      <h1 className="text-3xl font-extrabold">StudyPilot needs a backend</h1>
      <p className="text-ink-2">
        Copy <code className="num">.env.example</code> to <code className="num">.env.local</code> and fill in your Supabase URL and keys, then restart the dev server. See the README for local setup.
      </p>
    </main>
  );
}
