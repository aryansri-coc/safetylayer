import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafeLayer | Route-Safety Layer for Google Maps",
  description:
    "A privacy-first route safety layer on top of Google Maps powered by Gemma 4 multimodal extraction, Street View baseline priors, and Bayesian trust verification.",
  keywords: ["route safety", "Google Maps", "Gemma 4", "Hinglish road hazard", "Hacktoberfest"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#060911",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-night-950 text-slate-100 flex flex-col min-h-screen">
        {children}
      </body>
    </html>
  );
}
