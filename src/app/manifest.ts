import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StudyPilot",
    short_name: "StudyPilot",
    description: "Study smarter with Pip, your AI study bird.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F7FC",
    theme_color: "#2F7BF5",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Ask Pip", url: "/tutor", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Lessons", url: "/lessons", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Flashcards", url: "/flashcards", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
