import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { AuthCard } from "../AuthCard";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  if (await getViewer()) redirect("/home");
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const notice = sp.error === "oauth" ? "That sign-in didn't finish. Try again, or use your email and password." : sp.error === "demo" ? "The demo account isn't available right now." : undefined;
  return <AuthCard mode="login" next={next} notice={notice} />;
}
