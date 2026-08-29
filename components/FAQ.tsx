"use client";

import { useState } from "react";

export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Is my report really anonymous?",
    a: "Yes. No account, no login, no device fingerprint. We never store your raw IP. It is one-way hashed with a key that rotates daily, so it cannot be traced back to you or used to link your reports across days. That hash exists purely to catch spam and abuse.",
  },
  {
    q: "Can I report a bribe I refused to pay?",
    a: "Absolutely. Refused reports are among the most valuable. They tell us which departments back down when citizens hold firm.",
  },
  {
    q: "What happens if my report is wrong?",
    a: "Anyone can flag a report as fake. Flagged reports are hidden from rankings and reviewed by a moderator against the surrounding cluster of reports. If a report is found to be mistaken or malicious it is removed from the public index and excluded from every statistic. Reports never name private individuals, so an honest mistake about an amount or a date can be corrected without harming anyone.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="max-w-[760px] border-t hair">
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="border-b hair">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 py-[18px] text-left text-base font-medium"
            >
              <span>{item.q}</span>
              <span className="font-mono muted" aria-hidden>
                {isOpen ? "-" : "+"}
              </span>
            </button>
            {isOpen && <p className="max-w-[62ch] pb-5 muted-2">{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
