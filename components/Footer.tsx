import Link from "next/link";

const LINKS = [
  ["/reports", "Reports"],
  ["/dept", "Departments"],
  ["/cities", "Cities"],
  ["/compare", "Compare"],
  ["/data", "Data"],
  ["/terms", "Terms"],
];

export default function Footer() {
  return (
    <footer
      className="border-t border-nv-line text-nv-ink"
      style={{ background: "linear-gradient(180deg, var(--nv-deep), #080f0a)" }}
    >
      <div className="container-x">
        <div className="grid gap-12 py-14 pb-10 md:grid-cols-[5fr_7fr]">
          <div>
            <div className="text-[17px] font-semibold tracking-tight text-[#ffffff]">
              <b>Chai Paani</b>
            </div>
            <p className="mt-2.5 max-w-[36ch] text-sm text-nv-muted">Built in public. Data belongs to India.</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-3 content-start gap-x-10 gap-y-3 md:justify-end">
            {LINKS.map(([href, label]) => (
              <Link key={href} href={href} className="text-sm text-nv-ink/85 hover:text-nv">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap justify-between gap-4 border-t border-nv-line py-4 font-mono text-[11px] text-nv-muted">
          <span>A Fourth Echelon Initiative. AGPL-3.0. Open data. No ads, no tracking.</span>
          <span>Report counts measure reporting activity, not corruption prevalence.</span>
        </div>
      </div>
    </footer>
  );
}
