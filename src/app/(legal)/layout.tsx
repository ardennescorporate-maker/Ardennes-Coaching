import { Logo } from "@/components/shell/Logo";

export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Logo href="/login" />
      <article className="card card-pad mt-6 sm:p-8 [&_h1]:text-3xl [&_h1]:font-extrabold [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2 [&_p]:text-ink-2 [&_ul]:mt-2 [&_ul]:text-ink-2">{children}</article>
    </div>
  );
}
