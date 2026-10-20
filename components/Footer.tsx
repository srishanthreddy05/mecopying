"use client";

import Link from "next/link";
import { ShieldCheck, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-950/50 mt-auto py-12 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-900 font-bold font-mono text-sm">
                m<span className="text-[#ccff00] dark:text-[#a6d900]">/</span>
              </div>
              <span className="text-base font-black tracking-tight text-neutral-900 dark:text-white">
                mecopying<span className="text-neutral-500 font-normal">.in</span>
              </span>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm">
              <strong className="text-neutral-900 dark:text-white font-medium">copy it. link it. send it.</strong> A lightweight, developer-friendly toolkit for college students, programmers, and Gen Z creators.
            </p>
            <div className="flex items-center gap-2 pt-1 text-xs text-neutral-500 font-mono">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>All systems operational • Zero sign-up required</span>
            </div>
          </div>

          {/* Legal & Safety Column */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-white mb-3">
              Safety & Legal
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/terms"
                  className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
                >
                  Privacy & Data Retention
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Contact & Abuse Report
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-neutral-200/60 dark:border-neutral-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© 2026 Mecopying.in. Built for frictionless internet sharing.</p>
          <p className="flex items-center gap-1">
            Crafted with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for developers everywhere
          </p>
        </div>
      </div>
    </footer>
  );
}
