import { Pip } from "@/components/pip/Pip";

export const metadata = { title: "Offline" };

export default function Offline() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <Pip mood="think" size={140} animation="tilt" />
      <h1 className="text-3xl font-extrabold">You&apos;re offline</h1>
      <p className="text-ink-2">Pip can&apos;t reach the internet right now. Check your connection and try again. Your answers are saved when you&apos;re back online.</p>
      <a href="/home" className="btn btn-primary">
        Try again
      </a>
    </main>
  );
}
