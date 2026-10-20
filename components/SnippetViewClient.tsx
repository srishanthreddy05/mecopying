"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDisplayDate } from "@/lib/validations";
import CodeViewer from "@/components/CodeViewer";
import ReportModal from "@/components/ReportModal";
import {
  ChevronRight,
  QrCode,
  EyeOff,
  Globe,
  Flag,
  Check,
  Copy,
} from "lucide-react";

export interface SnippetData {
  id: string;
  slug: string;
  title: string;
  content: string;
  language: string;
  visibility: string;
  viewCount: number;
  expiresAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  collection: {
    id: string;
    slug: string;
    title: string;
    visibility: string;
    expiresAt?: Date | string | null;
  };
}

interface Props {
  snippet: SnippetData;
}

export default function SnippetViewClient({ snippet }: Props) {
  const router = useRouter();
  const [copiedLink, setCopiedLink] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const linesCount = snippet.content.split("\n").length;
  const byteSize = new TextEncoder().encode(snippet.content).length;
  const sizeFormatted =
    byteSize < 1024 ? `${byteSize} B` : `${(byteSize / 1024).toFixed(1)} KB`;

  const snippetPath = `/${snippet.collection.slug}/${snippet.slug}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleOpenQr = (e: React.MouseEvent) => {
    e.preventDefault();
    const fullUrl = `${window.location.origin}${snippetPath}`;
    router.push(`/qr?url=${encodeURIComponent(fullUrl)}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-neutral-500 font-mono">
        <Link href="/" className="hover:text-neutral-900 dark:hover:text-white transition">
          mecopying
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        <Link
          href={`/${snippet.collection.slug}`}
          className="hover:text-neutral-900 dark:hover:text-white transition font-medium"
        >
          {snippet.collection.slug}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        <span className="text-neutral-900 dark:text-white font-bold">{snippet.slug}</span>
      </nav>

      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-mono font-bold">
              {snippet.language}
            </span>

            {snippet.visibility === "UNLISTED" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium border border-amber-300 dark:border-amber-800">
                <EyeOff className="w-3 h-3" />
                Unlisted Snippet
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-300 dark:border-emerald-800">
                <Globe className="w-3 h-3" />
                Public Snippet
              </span>
            )}

            <span className="text-xs text-neutral-400 font-mono">
              {linesCount} {linesCount === 1 ? "line" : "lines"} • {sizeFormatted} • {snippet.viewCount} views
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">
            {snippet.title}
          </h1>

          <p className="text-xs text-neutral-500 font-mono">
            Published on{" "}
            <span suppressHydrationWarning>{formatDisplayDate(snippet.createdAt)}</span> in collection{" "}
            <Link
              href={`/${snippet.collection.slug}`}
              className="text-[#65a30d] dark:text-[#ccff00] font-bold hover:underline"
            >
              /{snippet.collection.slug}
            </Link>
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition active:scale-95"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
          </button>

          <Link
            href={`/qr?url=${encodeURIComponent(`https://mecopying.in${snippetPath}`)}`}
            onClick={handleOpenQr}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ccff00] hover:bg-[#b8e600] text-neutral-950 text-xs font-bold transition active:scale-95 shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code</span>
          </Link>
        </div>
      </div>

      {/* Unlisted Notice if Applicable */}
      {snippet.visibility === "UNLISTED" && (
        <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-700/50 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <EyeOff className="w-4 h-4 shrink-0" />
          <span>
            This snippet is <strong>Unlisted</strong>. It is not shown in the public collection listing and search engines cannot index it, but anyone who has this direct URL can view it.
          </span>
        </div>
      )}

      {/* Formatted Code Viewer */}
      <CodeViewer
        code={snippet.content}
        language={snippet.language}
        title={`${snippet.slug}.${snippet.language === "plaintext" ? "txt" : snippet.language}`}
      />

      {/* Bottom Footer Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
        <div className="flex items-center gap-4">
          <Link
            href={`/${snippet.collection.slug}`}
            className="hover:text-neutral-900 dark:hover:text-white transition font-medium"
          >
            ← Back to /{snippet.collection.slug}
          </Link>

          <Link
            href="/#create"
            className="hover:text-neutral-900 dark:hover:text-white transition font-medium hidden sm:inline"
          >
            Create your own snippet
          </Link>
        </div>

        <button
          onClick={() => setIsReportOpen(true)}
          className="flex items-center gap-1 hover:text-rose-500 transition cursor-pointer"
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Report content</span>
        </button>
      </div>

      {/* Abuse Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType="SNIPPET"
        targetId={`${snippet.collection.slug}/${snippet.slug}`}
      />
    </div>
  );
}
