import Link from "next/link";
import { Pip } from "@/components/pip/Pip";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <Pip mood="think" size={140} animation="tilt" />
      <h1 className="text-3xl font-extrabold">Pip can&apos;t find that page</h1>
      <p className="text-ink-2">It may have moved, or the link might be wrong.</p>
      <Link href="/home" className="btn btn-primary">
        Back to home
      </Link>
    </main>
  );
}
