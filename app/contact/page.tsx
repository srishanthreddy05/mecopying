import { Flag, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact & Abuse Reports | Mecopying",
  description: "Contact the Mecopying team or report abusive content.",
};

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-8">
      <div className="space-y-2 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-mono">
          <Flag className="w-3.5 h-3.5" />
          <span>Support & Abuse Desk</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-neutral-900 dark:text-white tracking-tight">
          Contact & Abuse
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Have feedback, need help, or want to report abusive content?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Fast Reporting */}
        <div className="p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Flag className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Instant Content Report</h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Every shared snippet includes a direct &ldquo;Report Content&rdquo; flag button at the bottom of its page. Submitting through that button automatically links the URL and flags the content for priority review.
          </p>
        </div>

        {/* Card 2: Moderation & Review */}
        <div className="p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Takedown Review</h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Flagged snippets are reviewed promptly. Any content violating our Terms of Service or containing malicious or infringing material is removed without delay.
          </p>
        </div>
      </div>
    </div>
  );
}
