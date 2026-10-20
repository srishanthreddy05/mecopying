import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://mecopying.in"),
  title: {
    default: "Mecopying — copy it. link it. send it.",
    template: "%s | Mecopying",
  },
  description:
    "A modern, playful sharing platform for students and developers. Save code snippets, organize into collections, and share via memorable URLs.",
  keywords: [
    "code sharing",
    "pastebin alternative",
    "code snippets",
    "developer tools",
    "programming snippets",
    "code paste",
  ],
  authors: [{ name: "Mecopying" }],
  openGraph: {
    title: "Mecopying — copy it. link it. send it.",
    description: "Save code, share snippets, and create clean custom links. No unnecessary complexity.",
    url: "https://mecopying.in",
    siteName: "Mecopying",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mecopying — copy it. link it. send it.",
    description: "Save code, share snippets, and create clean custom links.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

import AppShell from "@/components/AppShell";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#fbfbfd] dark:bg-[#090a0c] text-neutral-900 dark:text-neutral-100 transition-colors">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
