import Link from "next/link";
import { CheckCircle2, ArrowRight, PlusCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Deleted | Mecopying",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DeletedConfirmationPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 text-neutral-100 px-4">
      <div className="w-full max-w-md p-8 rounded-3xl border border-neutral-800 bg-[#121316] text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white tracking-tight">
            Page deleted successfully
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            The page has been permanently deleted from Mecopying. The link will now return a 404 Not Found.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-2xl bg-[#ccff00] hover:bg-[#b8e600] text-neutral-950 font-bold text-sm transition active:scale-98 shadow-md"
          >
            <PlusCircle className="w-4 h-4 text-neutral-950" />
            <span>Create a new share link</span>
            <ArrowRight className="w-4 h-4 text-neutral-950" />
          </Link>
        </div>
      </div>

      <div className="mt-8 text-xs text-neutral-600 font-mono">
        <Link href="/" className="hover:text-neutral-400 transition">
          mecopying.in
        </Link>
      </div>
    </div>
  );
}
