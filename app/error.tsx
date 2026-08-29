"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Client-side breadcrumb only; the server has already logged the full error under this digest.
    console.error("page error", error.digest ?? error.message);
  }, [error]);
  return (
    <section className="dark">
      <div className="wrap" style={{ padding: "96px 24px" }}>
        <h1>Something went wrong</h1>
        <p className="muted" style={{ marginTop: 12 }}>
          The page could not be rendered. Reference {error.digest ?? "n/a"}.
        </p>
        <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => reset()}>
          Try again
        </button>
      </div>
    </section>
  );
}
