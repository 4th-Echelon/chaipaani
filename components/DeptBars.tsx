import Link from "next/link";

export default function DeptBars({ items }: { items: { slug: string; name: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ol className="mt-4">
      {items.map((d) => (
        <li key={d.slug} className="grid grid-cols-[130px_1fr_40px] items-center gap-4 border-b border-line-light py-2.5 text-sm md:grid-cols-[200px_1fr_48px]">
          <Link href={`/dept/${d.slug}`} className="hover:underline">
            {d.name}
          </Link>
          <span aria-hidden className="h-2 bg-black" style={{ width: `${Math.round((d.count / max) * 100)}%` }} />
          <span className="text-right font-mono tabular-nums">{d.count}</span>
        </li>
      ))}
    </ol>
  );
}
