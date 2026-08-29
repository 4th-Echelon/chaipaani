import Link from "next/link";
import Logo from "./Logo";

const NAV = [
  { href: "/reports", label: "Reports" },
  { href: "/dept", label: "Departments" },
  { href: "/cities", label: "Cities" },
  { href: "/compare", label: "Compare" },
  { href: "/know-before-you-go", label: "Know before you go" },
];

export default function Header() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-nv-line text-nv-ink"
      style={{ background: "linear-gradient(180deg, var(--nv-deep-2), var(--nv-deep))" }}
    >
      <div className="container-x flex h-16 items-center gap-8">
        <Link href="/" className="flex items-center text-[#ffffff]" aria-label="Chai Paani home">
          <Logo height={40} />
        </Link>
        <nav aria-label="Primary" className="ml-auto hidden items-center gap-[26px] md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="border-b border-transparent py-1.5 text-sm text-nv-ink/85 hover:border-nv hover:text-nv-ink"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Link href="/report" className="btn-nv md:ml-0 ml-auto">
          Report a bribe
        </Link>
      </div>
      <nav aria-label="Mobile" className="flex justify-around border-t border-nv-line md:hidden">
        {NAV.slice(0, 4).map((n) => (
          <Link key={n.href} href={n.href} className="py-2 text-[13px] text-nv-ink/85">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
