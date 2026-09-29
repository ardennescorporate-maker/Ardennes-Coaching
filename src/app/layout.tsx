import type { Metadata, Viewport } from "next";
import { Baloo_2, JetBrains_Mono, Nunito } from "next/font/google";
import { themeBootScript } from "@/lib/theme";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const baloo = Baloo_2({ variable: "--font-baloo", subsets: ["latin"], weight: ["600", "700", "800"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], weight: ["500", "600", "700", "800", "900"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: { default: "StudyPilot", template: "%s · StudyPilot" },
  description: "Study smarter with Pip, your AI study bird. Lessons, practice papers, flashcards and a planner for the HSC, SAT, AP, GCSE, A-Level and IB.",
  applicationName: "StudyPilot",
  appleWebApp: { capable: true, title: "StudyPilot", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F7FC" },
    { media: "(prefers-color-scheme: dark)", color: "#0C1426" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${baloo.variable} ${nunito.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
