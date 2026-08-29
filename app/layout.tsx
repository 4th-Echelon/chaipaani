import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Geist is not in this Next release's next/font registry; load it from Google Fonts directly.
const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://chaipaani.fyi";
const DESCRIPTION =
  "India's crowdsourced corruption transparency platform. Anonymous bribe reports aggregated into department rankings, city breakdowns and service-level averages.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Chai Paani", template: "%s | Chai Paani" },
  description: DESCRIPTION,
  applicationName: "Chai Paani",
  keywords: ["bribe", "corruption", "India", "transparency", "RTO", "police", "anonymous report", "chai paani"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Chai Paani",
    title: "Chai Paani",
    description: "Report a bribe anonymously. See what people really pay, by department and city.",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chai Paani",
    description: "Report a bribe anonymously. See what people really pay, by department and city.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS_HREF} />
      </head>
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
