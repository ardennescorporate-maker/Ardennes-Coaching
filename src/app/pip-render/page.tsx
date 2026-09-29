import { notFound } from "next/navigation";
import { PipFace } from "@/components/pip/Pip";

/** Dev-only: renders Pip's face tile so scripts/gen-icons.mjs can screenshot app icons. */
export default async function PipRender({ searchParams }: PageProps<"/pip-render">) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  const size = Number(sp.size ?? 512);
  const maskable = sp.maskable === "1";
  const round = sp.round !== "0";
  const face = maskable ? size * 0.7 : size * 0.86;
  return (
    <div style={{ padding: 0, background: "transparent" }}>
      <div
        id="tile"
        style={{
          width: size,
          height: size,
          display: "grid",
          placeItems: "center",
          background: "#E4EEFF",
          border: maskable ? "none" : `${Math.max(2, size * 0.045)}px solid #2F7BF5`,
          borderRadius: maskable || !round ? 0 : size * 0.3,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <PipFace size={face} />
      </div>
    </div>
  );
}
