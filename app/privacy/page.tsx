import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Mecopying",
  description: "Privacy policy and data retention practices of Mecopying.in",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-8">
      <div className="space-y-2 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Privacy & Security</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-neutral-900 dark:text-white tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs text-neutral-500 font-mono">
          Zero trackers • Zero third-party ad networks
        </p>
      </div>

      <div className="space-y-6 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed font-sans">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">1. Minimal Anonymous Data Collection</h2>
          <p>
            Mecopying is designed with privacy-by-default. You do not need to create an account, register an email, or provide personal identity to use the service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">2. Cryptographic Password Protection</h2>
          <p>
            When you create a snippet with an optional deletion password, the password is cryptographically hashed and salted using bcrypt before being stored. Plaintext passwords are never saved, transmitted in page code, or logged.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">3. Access Control & Visibility</h2>
          <p>
            Snippets are shared via direct URLs (custom or randomly generated). Anyone with the URL can view the snippet content. Mecopying does not track users or sell user data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">4. Expiration Enforcement</h2>
          <p>
            When a snippet reaches its selected expiration time (1 hour, 24 hours, 7 days, 30 days), it is immediately rendered inaccessible by server-side query filters.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">5. Privacy Inquiries</h2>
          <p>
            For any privacy inquiries or data removal requests, please contact us at <a href="mailto:srishanthreddyy05@gmail.com" className="font-mono text-neutral-900 dark:text-white underline">srishanthreddyy05@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
