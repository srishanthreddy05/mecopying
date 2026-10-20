"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-neutral-950/80 border-b border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 font-bold font-mono text-lg shadow-sm transition-transform group-hover:scale-105">
            m<span className="text-[#ccff00] dark:text-[#a6d900]">/</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight text-neutral-900 dark:text-white flex items-center gap-1.5">
              mecopying<span className="text-xs font-mono font-medium px-1.5 py-0.5 rounded-full bg-[#ccff00] text-neutral-950 font-semibold">.in</span>
            </span>
          </div>
        </Link>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <Link
            href="/#create"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-sm font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 active:scale-98 transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-[#ccff00] dark:text-neutral-950" />
            <span>Create something</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
