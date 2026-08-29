import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x pt-24 text-center">
      <div className="font-mono text-6xl text-white">404</div>
      <p className="mt-4 text-ash">No such page in the registry.</p>
      <Link href="/" className="btn-ghost mt-8">Home</Link>
    </div>
  );
}
