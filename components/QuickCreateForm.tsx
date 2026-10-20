"use client";

import { useState, useEffect, useId } from "react";
import Link from "next/link";
import { normalizeSlug, EXPIRY_OPTIONS, ExpiryOptionValue } from "@/lib/validations";
import {
  Sparkles,
  Check,
  Copy,
  ExternalLink,
  QrCode,
  Lock,
  Eye,
  EyeOff,
  Clock,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  PlusCircle,
} from "lucide-react";

export default function QuickCreateForm() {
  const [title, setTitle] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [content, setContent] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [expiry, setExpiry] = useState<ExpiryOptionValue>("never");

  // Slug check states
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  // Submission & Result states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{
    slug: string;
    url: string;
    fullUrl: string;
    title?: string;
  } | null>(null);

  // Copy feedback state
  const [copiedLink, setCopiedLink] = useState(false);

  // Form IDs for accessibility
  const titleId = useId();
  const slugId = useId();
  const contentId = useId();
  const passwordId = useId();
  const expiryId = useId();

  // Debounced check for custom link availability
  useEffect(() => {
    const trimmed = customSlug.trim();
    if (!trimmed) return;

    if (trimmed.length < 2) {
      const timer = setTimeout(() => {
        setSlugAvailable(false);
        setSlugError("Link must be at least 2 characters.");
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(async () => {
      setIsCheckingSlug(true);
      try {
        const res = await fetch(`/api/slug-check?type=collection&slug=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (res.ok) {
          setSlugAvailable(data.available);
          setSlugError(data.available ? null : "This link is already taken. Try another.");
        } else {
          setSlugAvailable(false);
          setSlugError(data.error || "Invalid link format.");
        }
      } catch {
        setSlugAvailable(null);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [customSlug]);

  const handleCustomSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizeSlug(e.target.value);
    setCustomSlug(normalized);
    if (!normalized) {
      setSlugAvailable(null);
      setSlugError(null);
    }
  };

  const handleCopyLink = async () => {
    if (!createdResult) return;
    try {
      await navigator.clipboard.writeText(createdResult.fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setSubmitError("Please enter some content or code.");
      return;
    }

    const trimmedPassword = deletePassword.trim();
    if (!trimmedPassword || trimmedPassword.length < 4) {
      setSubmitError("Deletion password must be at least 4 characters.");
      return;
    }

    if (customSlug.trim() && slugAvailable === false) {
      setSubmitError("The chosen custom link is not available. Please choose a different link.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: customSlug.trim() || undefined,
          content,
          deletePassword: trimmedPassword,
          expiry,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create share link. Please try again.");
      }

      const origin = typeof window !== "undefined" ? window.location.origin : "https://mecopying.in";
      setCreatedResult({
        slug: data.slug,
        url: data.url,
        fullUrl: `${origin}${data.url}`,
        title: data.title,
      });
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAnother = () => {
    setTitle("");
    setCustomSlug("");
    setContent("");
    setDeletePassword("");
    setExpiry("never");
    setCreatedResult(null);
    setSubmitError(null);
    setSlugAvailable(null);
    setSlugError(null);
  };

  // SUCCESS SCREEN
  if (createdResult) {
    return (
      <div
        id="create"
        className="scroll-mt-20 p-6 sm:p-10 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl space-y-8 animate-in fade-in duration-300"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium">
              <Check className="w-3.5 h-3.5" />
              <span>Link Created</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
              Your link is ready!
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              Share it with anyone. They will see a clean, distraction-free view.
            </p>
          </div>

          <button
            onClick={handleCreateAnother}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition active:scale-95 self-start sm:self-auto cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#65a30d] dark:text-[#ccff00]" />
            <span>Create another</span>
          </button>
        </div>

        {/* Share URL Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-neutral-950 text-white space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
              Shareable Link
            </span>
            <span className="text-xs font-mono text-[#ccff00]">Public</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
            <span className="font-mono text-sm sm:text-base font-bold text-white break-all select-all">
              {createdResult.fullUrl}
            </span>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ccff00] hover:bg-[#b8e600] text-neutral-950 font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-neutral-950" /> : <Copy className="w-3.5 h-3.5 text-neutral-950" />}
                <span>{copiedLink ? "Copied!" : "Copy link"}</span>
              </button>

              <Link
                href={createdResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs transition"
              >
                <span>Open page</span>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
              </Link>

              <Link
                href={`/qr?url=${encodeURIComponent(createdResult.fullUrl)}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs transition"
                title="Get QR code for this link"
              >
                <QrCode className="w-3.5 h-3.5 text-[#ccff00]" />
                <span className="hidden sm:inline">QR Code</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Deletion Password Warning Banner */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-1">
          <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Keep your deletion password safe</span>
          </div>
          <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed pl-6">
            You cannot delete this page through the normal process if you lose your password. We do not store plain-text passwords and cannot recover them for you.
          </p>
        </div>

        {/* Action Button to Open */}
        <div className="flex justify-end pt-2">
          <Link
            href={createdResult.url}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-sm hover:opacity-90 transition active:scale-98 shadow-md"
          >
            <span>View your new page</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // CREATION FORM
  const linesCount = content ? content.split("\n").length : 0;
  const byteSize = new TextEncoder().encode(content).length;
  const sizeFormatted =
    byteSize < 1024 ? `${byteSize} B` : `${(byteSize / 1024).toFixed(1)} KB`;

  const previewSlug = customSlug || "your-link";

  return (
    <form
      id="create"
      onSubmit={handleSubmit}
      className="scroll-mt-20 p-6 sm:p-10 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl space-y-6"
    >
      {/* Header Info */}
      <div className="border-b border-neutral-100 dark:border-neutral-800 pb-5">
        <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#65a30d] dark:text-[#ccff00]" />
          <span>Create a share link</span>
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Paste anything, pick an optional link, and share instantly.
        </p>
      </div>

      {submitError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Row 1: Title (optional) & Custom link (optional) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="space-y-1.5">
          <label htmlFor={titleId} className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Title <span className="text-neutral-400 font-normal">(optional)</span>
          </label>
          <input
            id={titleId}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give it a name (optional)"
            maxLength={100}
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-[#ccff00] focus:border-transparent transition"
          />
        </div>

        {/* Custom link */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor={slugId} className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Custom link <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            {isCheckingSlug && (
              <span className="text-[11px] font-mono text-neutral-400 animate-pulse">Checking...</span>
            )}
            {!isCheckingSlug && customSlug && slugAvailable === true && (
              <span className="text-[11px] font-mono text-emerald-500 flex items-center gap-1">
                <Check className="w-3 h-3" /> Available
              </span>
            )}
            {!isCheckingSlug && customSlug && slugAvailable === false && (
              <span className="text-[11px] font-mono text-rose-500">Unavailable</span>
            )}
          </div>

          <div className="relative flex items-center">
            <span className="absolute left-3 text-xs font-mono text-neutral-400 select-none">
              mecopying.in/
            </span>
            <input
              id={slugId}
              type="text"
              value={customSlug}
              onChange={handleCustomSlugChange}
              placeholder="my-notes"
              maxLength={40}
              className={`w-full pl-[98px] pr-3.5 py-2.5 rounded-xl border ${
                slugError
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-neutral-200 dark:border-neutral-800 focus:ring-[#ccff00]"
              } bg-neutral-50/50 dark:bg-neutral-950 text-neutral-900 dark:text-white font-mono text-sm focus:outline-hidden focus:ring-2 focus:border-transparent transition`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
            {slugError ? (
              <span className="text-rose-500">{slugError}</span>
            ) : (
              <span>Leave blank and we&apos;ll create a random link for you.</span>
            )}
            <span className="hidden sm:inline text-neutral-500">
              Preview: mecopying.in/{previewSlug}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content / Code Editor (Primary Focus) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor={contentId} className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Your content <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
            <span>{linesCount} {linesCount === 1 ? "line" : "lines"}</span>
            <span>•</span>
            <span>{sizeFormatted}</span>
          </div>
        </div>

        <div className="relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-[#0d0e11] text-neutral-100 overflow-hidden shadow-inner focus-within:ring-2 focus-within:ring-[#ccff00] focus-within:border-transparent transition">
          <div className="flex items-center justify-between px-4 py-2 bg-[#16171b] border-b border-neutral-800/80 text-[11px] text-neutral-400 font-mono select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70 inline-block"></span>
              <span className="ml-2 text-neutral-400">Plain text, code, JSON, logs, SQL, notes</span>
            </div>
            <span>Preserves exact spacing &amp; indentation</span>
          </div>

          <textarea
            id={contentId}
            required
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste anything here... (code, notes, terminal outputs, JSON, configs)"
            spellCheck={false}
            className="w-full p-4 bg-transparent text-[13px] font-mono leading-relaxed text-neutral-100 placeholder-neutral-500 focus:outline-hidden resize-y min-h-[200px]"
          />
        </div>
      </div>

      {/* Row 2: Deletion Password & Expiration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Deletion Password */}
        <div className="space-y-1.5">
          <label htmlFor={passwordId} className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Deletion password <span className="text-rose-500">*</span>
          </label>

          <div className="relative flex items-center">
            <Lock className="w-4 h-4 text-neutral-400 absolute left-3 select-none pointer-events-none" />
            <input
              id={passwordId}
              required
              type={showPassword ? "text" : "password"}
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Create a password to delete this page"
              minLength={4}
              maxLength={100}
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-[#ccff00] focus:border-transparent transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute right-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Remember this password. You&apos;ll need it if you want to delete your page.
          </p>
        </div>

        {/* Expiration */}
        <div className="space-y-1.5">
          <label htmlFor={expiryId} className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Delete this link after <span className="text-neutral-400 font-normal">(optional)</span>
          </label>

          <div className="relative flex items-center">
            <Clock className="w-4 h-4 text-neutral-400 absolute left-3 select-none pointer-events-none" />
            <select
              id={expiryId}
              value={expiry}
              onChange={(e) => setExpiry(e.target.value as ExpiryOptionValue)}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-[#ccff00] focus:border-transparent transition"
            >
              {EXPIRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            The page will automatically expire and be deleted from the server.
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-xs text-neutral-500">
          No sign up required. Anyone with the link will be able to view this page.
        </p>

        <button
          type="submit"
          disabled={isSubmitting || (Boolean(customSlug.trim()) && slugAvailable === false)}
          className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-[#ccff00] hover:bg-[#b8e600] text-neutral-950 font-bold text-sm sm:text-base transition active:scale-98 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin"></div>
              <span>Creating link...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-neutral-950" />
              <span>Create share link</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
