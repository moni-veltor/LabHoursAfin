import "./globals.css";
import type { Metadata } from "next";
import { Sora, Space_Grotesk, Source_Sans_3 } from "next/font/google";
import { Nav } from "@/components/nav";
import { FlavourBand } from "@/components/flavour-band";
import { CmdKHost } from "@/components/cmdk-host";
import { Toaster } from "@/components/toast";
import { AnnouncementBanner } from "@/components/announcement-banner";

// The estate's three faces: Sora for titles and the nav, Space Grotesk for
// eyebrows and labels, Source Sans 3 for the reading — the same three the
// Academy and the hub wear, replacing the Inter this ran alone on.
const sora = Sora({ variable: "--font-display-primary", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const spaceGrotesk = Space_Grotesk({ variable: "--font-label-primary", subsets: ["latin"], weight: ["500", "600", "700"], display: "swap" });
const sourceSans = Source_Sans_3({ variable: "--font-body-primary", subsets: ["latin"], weight: ["300", "400", "600"], display: "swap" });

export const metadata: Metadata = {
  title: "Lab Hours",
  description: "Tech-team initiatives anyone in the company can join",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${spaceGrotesk.variable} ${sourceSans.variable}`}>
      <body className="min-h-screen bg-canvas font-sans text-ink-text antialiased">
        <div className="flex min-h-screen">
          <Nav />
          <div className="flex min-w-0 flex-1 flex-col">
            <FlavourBand />
            <div className="relative -mt-5 flex flex-1 flex-col rounded-t-2xl bg-canvas pb-24 shadow-[0_-8px_24px_-16px_rgba(12,45,59,.35)] lg:pb-4">
              <AnnouncementBanner />
              <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
                {children}
              </main>
            </div>
          </div>
        </div>
        <CmdKHost />
        <Toaster />
      </body>
    </html>
  );
}
