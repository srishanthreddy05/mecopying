"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDisplayDate } from "@/lib/validations";
import {
  Copy,
  Check,
  QrCode,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  WrapText,
} from "lucide-react";

export interface SharedPageData {
  id: string;
  slug: string;
  title?: string;
  content: string;
  createdAt: Date | string;
  expiresAt?: Date | string | null;
  viewCount?: number;
  collectionSlug?: string;
  snippetSlug?: string;
}

interface Props {
  page: SharedPageData;
}

export default function MinimalSharedPage({ page }: Props) {
  const router = useRouter();

  // Copy states
  const [copiedContent, setCopiedContent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [wrapLines, setWrapLines] = useState(true);

  // Delete modal states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const lines = page.content.split("\n");
  const byteSize = new TextEncoder().encode(page.content).length;
  const sizeFormatted =
    byteSize < 1024 ? `${byteSize} B` : `${(byteSize / 1024).toFixed(1)} KB`;

  const displayPath = page.collectionSlug && page.snippetSlug
    ? `/${page.collectionSlug}/${page.snippetSlug}`
    : `/${page.slug}`;

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(page.content);
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    } catch {
      // fallback
    }
  };

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
    const fullUrl = `${window.location.origin}${displayPath}`;
    router.push(`/qr?url=${encodeURIComponent(fullUrl)}`);
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);

    const trimmedPassword = deletePassword.trim();
    if (!trimmedPassword) {
      setDeleteError("Please enter your deletion password.");
      return;
    }

    setIsDeleting(true);

    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: page.slug,
          collectionSlug: page.collectionSlug,
          snippetSlug: page.snippetSlug,
          password: trimmedPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Incorrect deletion password. Please try again.");
      }

      // Successful deletion -> redirect to deletion confirmation page
      router.push(`/deleted?slug=${encodeURIComponent(displayPath.replace(/^\//, ""))}`);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete page.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-neutral-950 text-neutral-100 selection:bg-[#ccff00] selection:text-neutral-950">
      {/* 1. COMPACT MINIMAL HEADER */}
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo & Path */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 group transition"
              title="Mecopying home"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#ccff00] group-hover:scale-125 transition-transform"></span>
              <span className="font-bold text-sm tracking-tight text-white font-sans">
                mecopying
              </span>
            </Link>

            <span className="text-neutral-700 font-mono text-xs">/</span>

            <span className="font-mono text-xs text-neutral-400 truncate max-w-[180px] sm:max-w-sm">
              {displayPath}
            </span>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-white font-sans font-medium transition active:scale-95 cursor-pointer shadow-xs"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#ccff00]" />
                  <span className="text-[#ccff00]">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Copy link</span>
                </>
              )}
            </button>

            <Link
              href={`/qr?url=${encodeURIComponent(`https://mecopying.in${displayPath}`)}`}
              onClick={handleOpenQr}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-white font-sans font-medium transition active:scale-95 shadow-xs"
              title="Generate QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-[#ccff00]" />
              <span className="hidden sm:inline">QR Code</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT SECTION */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-4">
        {/* Title if one exists */}
        {page.title && page.title.trim().length > 0 && (
          <div className="pb-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight break-words font-sans">
              {page.title}
            </h1>
            <p className="text-xs text-neutral-500 font-mono mt-1" suppressHydrationWarning>
              Published on {formatDisplayDate(page.createdAt)}
            </p>
          </div>
        )}

        {/* Content Box */}
        <div className="rounded-2xl border border-neutral-800 bg-[#0d0e11] shadow-2xl overflow-hidden font-mono">
          {/* Panel Header */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#16171b] border-b border-neutral-800/80">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
              <span className="text-xs text-neutral-400 font-mono ml-2">
                {lines.length} {lines.length === 1 ? "line" : "lines"} • {sizeFormatted}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setWrapLines(!wrapLines)}
                title={wrapLines ? "Disable wrap" : "Enable wrap"}
                className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                  wrapLines
                    ? "bg-neutral-800 border-neutral-700 text-[#ccff00]"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                <WrapText className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleCopyContent}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#ccff00] hover:bg-[#b8e600] text-neutral-950 text-xs font-bold font-sans transition active:scale-95 shadow-xs cursor-pointer"
              >
                {copiedContent ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-neutral-950" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-neutral-950" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Panel Body: Code / Text */}
          <div className="flex overflow-x-auto text-[13px] leading-relaxed p-4 sm:p-6 select-text">
            {/* Line numbers gutter */}
            <div
              className="select-none text-right pr-4 text-neutral-600 font-mono border-r border-neutral-800/80 mr-4 text-xs"
              aria-hidden="true"
            >
              {lines.map((_, i) => (
                <div key={i} className="leading-relaxed">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Content text (pure untrusted plain text - strictly safe from script execution) */}
            <pre
              suppressHydrationWarning
              className={`flex-1 m-0 p-0 bg-transparent overflow-visible text-neutral-100 ${
                wrapLines ? "whitespace-pre-wrap break-all" : "whitespace-pre overflow-x-auto"
              }`}
            >
              <code className="block select-text font-mono">{page.content}</code>
            </pre>
          </div>
        </div>
      </main>

      {/* 3. COMPACT FOOTER */}
      <footer className="border-t border-neutral-900 py-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-neutral-500">
          <Link
            href="/"
            className="flex items-center gap-1.5 hover:text-neutral-300 transition group"
          >
            <span>Made with</span>
            <span className="font-bold text-white group-hover:text-[#ccff00] transition">
              Mecopying
            </span>
          </Link>

          <button
            onClick={() => {
              setDeleteError(null);
              setDeletePassword("");
              setIsDeleteOpen(true);
            }}
            className="flex items-center gap-1 text-neutral-500 hover:text-rose-400 transition cursor-pointer text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </footer>

      {/* 4. SECURE DELETION MODAL */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md rounded-3xl border border-neutral-800 bg-[#121316] p-6 shadow-2xl space-y-5 text-neutral-100"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 id="delete-dialog-title" className="text-lg font-bold text-white">
                  Delete this page?
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  This action permanently deletes this content.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="del-password-input"
                  className="block text-xs font-semibold text-neutral-300"
                >
                  Deletion password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3 select-none pointer-events-none" />
                  <input
                    id="del-password-input"
                    type={showPassword ? "text" : "password"}
                    required
                    autoFocus
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter deletion password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-neutral-800 bg-neutral-900 text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 text-neutral-400 hover:text-neutral-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Enter the password set when this page was created.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isDeleting || !deletePassword.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Confirm Delete</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
