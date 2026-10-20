"use client";

import Link from "next/link";
import { useState } from "react";
import { Code2, QrCode, Clock, Menu, X, PlusCircle, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Code", icon: Code2, active: pathname === "/" },
    { href: "/qr", label: "QR Me", icon: QrCode, active: pathname.startsWith("/qr") },
    { href: "/futureme", label: "FutureMe", icon: Clock, active: pathname.startsWith("/futureme") },
  ];

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

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-neutral-100/70 dark:bg-neutral-900/70 p-1 rounded-full border border-neutral-200/60 dark:border-neutral-800">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  link.active
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-neutral-800/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Button */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/#create"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-sm font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 active:scale-98 transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-[#ccff00] dark:text-neutral-950" />
            <span>Create something</span>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/#create"
            className="p-2 rounded-lg bg-[#ccff00] text-neutral-950 text-sm font-bold active:scale-95 transition"
            aria-label="Create something"
          >
            <PlusCircle className="w-5 h-5" />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md px-4 pt-2 pb-6 space-y-2 animate-in fade-in slide-in-from-top-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  link.active
                    ? "bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                }`}
              >
                <Icon className="w-4 h-4 text-neutral-500" />
                {link.label}
              </Link>
            );
          })}
          <div className="pt-2">
            <Link
              href="/#create"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-sm font-semibold shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-[#ccff00] dark:text-neutral-950" />
              Create something
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
