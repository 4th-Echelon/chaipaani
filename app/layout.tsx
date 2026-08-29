import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Geist is not in this Next release's next/font registry; load it from Google Fonts directly.
const FONTS_HREF = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap";

export const metadata: Metadata = {
  title: { default: "Chai Paani", template: "%s | Chai Paani" },
  description:
    "Anonymous bribe reports aggregated into department rankings, city breakdowns, and service-level averages. India's crowdsourced corruption transparency platform.",
  openGraph: {
    title: "Chai Paani",
    description: "See how much people pay in bribes, by department and city.",
    siteName: "Chai Paani",
    locale: "en_IN",
    type: "website",
  },
  twitter: { card: "summary", title: "Chai Paani", description: "See how much people pay in bribes, by department and city." },
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
