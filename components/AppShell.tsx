"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // If path is a shared snippet/page or deletion confirmation, use dedicated minimal view without site header/footer
  const isMarketingOrToolPage =
    !pathname ||
    pathname === "/" ||
    pathname.startsWith("/qr") ||
    pathname.startsWith("/futureme") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/manage");

  if (!isMarketingOrToolPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Suspense fallback={<div className="h-16 border-b border-neutral-200 dark:border-neutral-800" />}>
        <Navbar />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main className="flex-1">{children}</main>}>
      <AppShellContent>{children}</AppShellContent>
    </Suspense>
  );
}
