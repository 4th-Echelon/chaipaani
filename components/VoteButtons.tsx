"use client";

import { useState } from "react";

export default function VoteButtons({ reportId, helpful, fake }: { reportId: string; helpful: number; fake: number }) {
  const [h, setH] = useState(helpful);
  const [f, setF] = useState(fake);
  const [done, setDone] = useState<"helpful" | "fake" | null>(null);
  const [busy, setBusy] = useState(false);

  async function vote(type: "helpful" | "fake") {
    if (done || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ report_id: reportId, type }),
      });
      if (res.ok) {
        const data = await res.json();
        setH(data.helpful_count ?? h + (type === "helpful" ? 1 : 0));
        setF(data.fake_count ?? f + (type === "fake" ? 1 : 0));
        setDone(type);
      }
    } finally {
      setBusy(false);
    }
  }

  const base = "h-[30px] border px-2.5 text-xs font-medium transition-colors hair hover:border-current disabled:cursor-default disabled:opacity-50";
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => vote("helpful")} disabled={!!done || busy} aria-label="Mark as helpful" className={base}>
        Helpful ({h})
      </button>
      <button type="button" onClick={() => vote("fake")} disabled={!!done || busy} aria-label="Flag for review" className={base}>
        Flag as fake ({f})
      </button>
    </div>
  );
}
