import { Logo } from "@/components/shell/Logo";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { AuthHero } from "./AuthHero";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-4 sm:px-6">
        <Logo href="/login" />
        <ThemeToggle />
      </header>
      <main id="main" className="mx-auto grid max-w-[1180px] items-start gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-[1fr_minmax(0,500px)] lg:gap-14 lg:pt-6">
        <AuthHero />
        <div className="min-w-0">{children}</div>
      </main>
    </div>
  );
}
