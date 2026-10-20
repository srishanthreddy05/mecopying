import QuickCreateForm from "@/components/QuickCreateForm";
import CodeViewer from "@/components/CodeViewer";
import {
  Code2,
  Lock,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const DEMO_SNIPPET = `// Example: Binary Search in TypeScript
function binarySearch(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}

// Mecopying preserves exact whitespace, tabs, and indentation!
console.log(binarySearch([1, 3, 5, 7, 9, 11], 7)); // -> 3
console.log(binarySearch([10, 20, 30, 40, 50], 30)); // -> 2`;

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full pt-16 sm:pt-24 pb-12 px-4 sm:px-6 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-mono font-medium text-neutral-800 dark:text-neutral-200 mb-6 shadow-xs animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-[#ccff00]"></span>
          <span>mecopying.in • copy it. link it. send it.</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-neutral-950 dark:text-white max-w-4xl mx-auto leading-[1.08]">
          Your stuff. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-500 dark:from-white dark:via-neutral-200 dark:to-neutral-400 bg-clip-text text-transparent">
            One link away.
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
          Save text, share snippets, and send everything through one simple link.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#create"
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#ccff00] hover:bg-[#bbf000] text-neutral-950 font-bold text-sm sm:text-base active:scale-98 transition shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-neutral-950" />
            <span>Create a snippet</span>
          </a>

          <a
            href="#features"
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white font-semibold text-sm sm:text-base active:scale-98 transition shadow-xs"
          >
            <span>Explore features</span>
            <ArrowRight className="w-4 h-4 text-neutral-400" />
          </a>
        </div>
      </section>

      {/* Main Interactive Quick-Create Section */}
      <section className="w-full px-4 sm:px-6 max-w-4xl mx-auto pb-20">
        <QuickCreateForm />
      </section>

      {/* How It Works Section */}
      <section className="w-full py-16 px-4 sm:px-6 bg-neutral-100/60 dark:bg-neutral-900/40 border-y border-neutral-200/80 dark:border-neutral-800/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#65a30d] dark:text-[#ccff00]">
              Frictionless Sharing
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white mt-1">
              How it works
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
              Three steps from terminal to a memorable link.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs relative overflow-hidden group hover:border-neutral-300 dark:hover:border-neutral-700 transition">
              <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white font-bold font-mono text-sm mb-4">
                01
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                Write or paste
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Drop your code, notes, logs, or script. Any text format or indentation is preserved with zero formatting loss.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs relative overflow-hidden group hover:border-neutral-300 dark:hover:border-neutral-700 transition">
              <div className="w-10 h-10 rounded-2xl bg-[#ccff00]/20 dark:bg-[#ccff00]/10 text-neutral-950 dark:text-[#ccff00] flex items-center justify-center font-bold font-mono text-sm mb-4">
                02
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                Pick your link
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Choose a custom link like <code className="font-mono text-xs px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">/my-notes</code> or let us create a random one. Set an optional deletion password.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs relative overflow-hidden group hover:border-neutral-300 dark:hover:border-neutral-700 transition">
              <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white font-bold font-mono text-sm mb-4">
                03
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                Share anywhere
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Share your link anywhere — WhatsApp, Discord, email, or with friends.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Shared Snippet Preview Demo */}
      <section className="w-full py-16 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#65a30d] dark:text-[#ccff00]">
              Preview
            </span>
            <h2 className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
              What your friends see
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Clean, readable code cards with 1-click copy and zero intrusive ads.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Live Interactive Demo</span>
          </div>
        </div>

        <CodeViewer
          code={DEMO_SNIPPET}
          language="typescript"
          title="binary-search.ts"
        />
      </section>

      {/* Feature Cards Section */}
      <section id="features" className="w-full py-16 px-4 sm:px-6 max-w-6xl mx-auto scroll-mt-20">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#65a30d] dark:text-[#ccff00]">
            The Mecopying Platform
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white mt-1">
            Built for friction-free sharing
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
            No signup walls. No bloated enterprise dashboards. Just fast, secure snippet sharing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Code & Collections */}
          <div className="p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col justify-between hover:shadow-lg transition">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-5 text-neutral-900 dark:text-white">
                <Code2 className="w-6 h-6 text-[#65a30d] dark:text-[#ccff00]" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                Instant Clean Links
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
                Share code snippets, notes, or problem sets with optional custom slugs like <code className="font-mono text-xs px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">/my-notes</code> or random 8-character links.
              </p>
            </div>
            <a
              href="#create"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-900 dark:text-white hover:text-[#65a30d] dark:hover:text-[#ccff00] transition"
            >
              <span>Create snippet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Card 2: Password-Protected Edit & Delete */}
          <div className="p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col justify-between hover:shadow-lg transition">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-5 text-neutral-900 dark:text-white">
                <Lock className="w-6 h-6 text-[#65a30d] dark:text-[#ccff00]" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                Password Protection & Edit
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
                Set a private deletion password during creation. Use it anytime to update title and code in-place, or permanently delete the page.
              </p>
            </div>
            <a
              href="#create"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-900 dark:text-white hover:text-[#65a30d] dark:hover:text-[#ccff00] transition"
            >
              <span>Try password protection</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Card 3: Auto-Expiration */}
          <div className="p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col justify-between hover:shadow-lg transition">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-5 text-neutral-900 dark:text-white">
                <Clock className="w-6 h-6 text-[#65a30d] dark:text-[#ccff00]" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                Timed Auto-Expiration
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
                Set snippets to automatically self-destruct after 1 hour, 24 hours, 7 days, or 30 days, or keep them accessible permanently.
              </p>
            </div>
            <a
              href="#create"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-900 dark:text-white hover:text-[#65a30d] dark:hover:text-[#ccff00] transition"
            >
              <span>Explore expiry options</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
