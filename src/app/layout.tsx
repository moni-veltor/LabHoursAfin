import "./globals.css";
import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { CmdKHost } from "@/components/cmdk-host";

export const metadata: Metadata = {
  title: "Lab Hours",
  description: "Tech-team initiatives anyone in the company can join",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <CmdKHost />
      </body>
    </html>
  );
}
