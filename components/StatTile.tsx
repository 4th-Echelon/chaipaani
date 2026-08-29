export default function StatTile({
  value,
  label,
  sub,
}: {
  index?: string;
  value: string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="border-t pt-5 hair-strong">
      <div className="font-mono text-4xl font-medium leading-none tracking-[-0.03em]">{value}</div>
      <div className="mt-2 text-[13px]">{label}</div>
      {sub && <p className="mt-0.5 text-xs muted">{sub}</p>}
    </div>
  );
}
