/**
 * Chai Paani wordmark. The PNG alpha is applied as a CSS mask so the mark takes
 * the surrounding text colour (white on the green bands, black on light
 * sections). It is fetched once and cached rather than inlined on every page.
 */
export default function Logo({ className = "", height = 28, title = "Chai Paani" }: { className?: string; height?: number; title?: string }) {
  const width = Math.round(height * 2.3812);
  return (
    <span
      role="img"
      aria-label={title}
      className={`inline-block shrink-0 align-middle ${className}`}
      style={{
        width,
        height,
        backgroundColor: "currentColor",
        WebkitMaskImage: "url(/brand/logo-mask.png)",
        maskImage: "url(/brand/logo-mask.png)",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
