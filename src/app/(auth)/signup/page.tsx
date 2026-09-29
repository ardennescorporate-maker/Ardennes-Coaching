import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { AuthCard } from "../AuthCard";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  if (await getViewer()) redirect("/home");
  return <AuthCard mode="signup" next={typeof sp.next === "string" ? sp.next : undefined} />;
}
