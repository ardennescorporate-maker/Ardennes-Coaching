import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";

export default async function Root() {
  redirect((await getViewer()) ? "/home" : "/login");
}
