"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F4F7FC", color: "#0F1E3D", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1>StudyPilot hit turbulence</h1>
          <p>Please refresh the page. If it keeps happening, try again in a few minutes.</p>
          <button onClick={reset} style={{ padding: "10px 18px", borderRadius: 14, border: 0, background: "#2F7BF5", color: "#fff", fontWeight: 800 }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
