"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#101211", color: "#f2f3ef", fontFamily: "system-ui, sans-serif", padding: 48 }}>
        <h1>Chai Paani is temporarily unavailable</h1>
        <p style={{ marginTop: 12, opacity: 0.7 }}>Reference {error.digest ?? "n/a"}. Please try again in a moment.</p>
        <button
          onClick={() => reset()}
          style={{ marginTop: 24, padding: "10px 20px", background: "#f2f3ef", color: "#101211", border: 0, cursor: "pointer" }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
