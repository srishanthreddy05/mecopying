import { FileText } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Mecopying",
  description: "Terms of service and acceptable use policy for Mecopying.in",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-8">
      <div className="space-y-2 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-mono">
          <FileText className="w-3.5 h-3.5" />
          <span>Legal & Acceptable Use</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-neutral-900 dark:text-white tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs text-neutral-500 font-mono">
          Last updated: October 2026
        </p>
      </div>

      <div className="space-y-6 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed font-sans">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">1. Service Purpose</h2>
          <p>
            Mecopying.in is a lightweight internet sharing utility allowing users to save and distribute code snippets, collections, time-locked messages, and QR codes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">2. Acceptable Use & Forbidden Content</h2>
          <p>You agree NOT to use Mecopying.in to store or distribute:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
            <li>Malicious code, exploit payloads, viruses, ransomware, or malware loaders.</li>
            <li>Stolen credentials, API keys, private keys, or leaked confidential databases.</li>
            <li>Phishing kits or deceptive scam redirects.</li>
            <li>Harassing, defamatory, or hateful content.</li>
            <li>Content violating copyright or intellectual property rights.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">3. Anonymous Ownership & Retention</h2>
          <p>
            Mecopying allows anonymous creation. A private management token is generated and returned to you once upon creation. We store only cryptographic hashes of tokens; therefore, lost management links cannot be recovered. Expired or abandoned content may be pruned in accordance with our retention policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">4. Abuse Moderation & Takedowns</h2>
          <p>
            We reserve the right to remove any snippet, collection, or message that violates this policy immediately without notice. Anyone can report abuse via our built-in report button or by contacting us.
          </p>
        </section>
      </div>
    </div>
  );
}
