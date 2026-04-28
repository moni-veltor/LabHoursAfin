import "./globals.css";
import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { CmdKHost } from "@/components/cmdk-host";
import { Toaster } from "@/components/toast";
import { AnnouncementBanner } from "@/components/announcement-banner";

export const metadata: Metadata = {
  title: "Lab Hours",
  description: "Tech-team initiatives anyone in the company can join",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-ink font-sans text-ink-text antialiased">
        <AnnouncementBanner />
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">{children}</main>
        <CmdKHost />
        <Toaster />
      </body>
    </html>
  );
}
