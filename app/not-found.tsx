import Link from "next/link";
import { ArrowLeft, Code2 } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 sm:py-32 text-center space-y-6">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-mono font-medium text-neutral-600 dark:text-neutral-400">
        <span>404</span>
        <span>•</span>
        <span>Lost in Cyberspace</span>
      </div>

      <h1 className="text-4xl sm:text-6xl font-black text-neutral-900 dark:text-white tracking-tight">
        Link not found.
      </h1>

      <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-md mx-auto">
        This snippet or collection might have expired, been deleted by its owner, or you followed a mistyped URL.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-sm font-semibold transition active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Homepage</span>
        </Link>

        <Link
          href="/#create"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ccff00] hover:bg-[#b8e600] text-neutral-950 text-sm font-bold transition active:scale-95 shadow-sm"
        >
          <Code2 className="w-4 h-4 text-neutral-950" />
          <span>Create New Snippet</span>
        </Link>
      </div>
    </div>
  );
}
