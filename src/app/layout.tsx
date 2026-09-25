import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Nav } from "@/components/nav";
import { FlavourBand } from "@/components/flavour-band";
import { CmdKHost } from "@/components/cmdk-host";
import { Toaster } from "@/components/toast";
import { AnnouncementBanner } from "@/components/announcement-banner";

// The estate's three faces: Sora for titles and the nav, Space Grotesk for
// eyebrows and labels, Source Sans 3 for the reading — the same three the
// Academy and the hub wear, replacing the Inter this ran alone on.
// Self-hosted, for the reason the Academy's are: next/font/google fetches from
// fonts.gstatic.com while the app is being built, which makes a clean CI run
// depend on the network. It failed there once and passed unchanged on a re-run,
// and this app has the same fonts and the same CI. 84KB for all three, because
// each family is one variable font rather than a file per weight.
const sora = localFont({ src: "./fonts/sora.woff2", variable: "--font-display-primary", weight: "400 700", display: "swap" });
const spaceGrotesk = localFont({ src: "./fonts/space-grotesk.woff2", variable: "--font-label-primary", weight: "500 700", display: "swap" });
const sourceSans = localFont({ src: "./fonts/source-sans-3.woff2", variable: "--font-body-primary", weight: "300 600", display: "swap" });

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
            {/* The sheet rides up over the band. The width cap that used to be
                here — max-w-5xl, on top of a 16rem rail — left a third of a
                laptop empty on pages that are mostly wide tables and card
                grids. The content is the window now, with gutters, and the
                rail collapses when it is in the way. */}
            <div className="relative -mt-5 flex flex-1 flex-col rounded-t-2xl bg-canvas pb-10 shadow-[0_-8px_24px_-16px_rgba(7,32,44,.35)]">
              <AnnouncementBanner />
              <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
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
