"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clock,
  Lock,
  Check,
  Copy,
  ExternalLink,
  AlertCircle,
  Key,
  ShieldCheck,
} from "lucide-react";

export default function FutureMePage() {
  const [title, setTitle] = useState("");
  const [hint, setHint] = useState("");
  const [content, setContent] = useState("");
  const [unlockDateTime, setUnlockDateTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success result
  const [createdResult, setCreatedResult] = useState<{
    slug: string;
    shareUrl: string;
    manageUrl: string;
    manageToken: string;
    unlockAt: string;
  } | null>(null);

  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedManage, setCopiedManage] = useState(false);

  // Quick preset helper
  const setQuickDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setUnlockDateTime(d.toISOString().slice(0, 16));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please provide a title for your message.");
      return;
    }
    if (!content.trim()) {
      setError("Please write your message body.");
      return;
    }
    if (!unlockDateTime) {
      setError("Please select an unlock date and time.");
      return;
    }

    const unlockDate = new Date(unlockDateTime);
    if (unlockDate.getTime() <= Date.now()) {
      setError("Unlock date and time must be in the future.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/futureme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          hint: hint.trim() || undefined,
          content,
          unlockAt: unlockDate.toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create FutureMe message");
      }

      setCreatedResult({
        slug: data.message.slug,
        shareUrl: data.urls.shareUrl,
        manageUrl: data.urls.manageUrl,
        manageToken: data.manageToken,
        unlockAt: data.message.unlockAt,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string, type: "share" | "manage") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "share") {
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
      } else {
        setCopiedManage(true);
        setTimeout(() => setCopiedManage(false), 2000);
      }
    } catch {
      // fallback
    }
  };

  if (createdResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-xl text-left animate-in zoom-in-95">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#ccff00] text-neutral-950 flex items-center justify-center font-bold">
              <Lock className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-neutral-900 dark:text-white">
                Message Locked & Sealed!
              </h2>
              <p className="text-xs text-neutral-500 font-mono">
                Unlocks: {new Date(createdResult.unlockAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Shareable Link Box */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 mb-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2 block">
              Shareable Unlock Link (Send to recipient or bookmark)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={createdResult.shareUrl}
                className="w-full bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm font-mono px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(createdResult.shareUrl, "share")}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold text-sm transition active:scale-95 whitespace-nowrap shadow-sm"
              >
                {copiedShare ? <Check className="w-4 h-4 text-[#ccff00] dark:text-neutral-950" /> : <Copy className="w-4 h-4" />}
                <span>{copiedShare ? "Copied!" : "Copy Link"}</span>
              </button>
            </div>
          </div>

          {/* Private Key Box */}
          <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-700/50 mb-6">
            <div className="flex items-start gap-2.5 mb-2">
              <Key className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Creator Management Link
                </span>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Keep this link if you want to delete this message early. No one else has access to this link.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                readOnly
                value={createdResult.manageUrl}
                className="w-full bg-white dark:bg-neutral-950 text-amber-900 dark:text-amber-200 text-xs font-mono px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700/50 outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(createdResult.manageUrl, "manage")}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition active:scale-95 whitespace-nowrap"
              >
                {copiedManage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedManage ? "Copied Secret!" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <Link
              href={createdResult.shareUrl}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ccff00] hover:bg-[#b8e600] text-neutral-950 text-sm font-bold transition shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Preview Locked Message</span>
            </Link>

            <button
              onClick={() => {
                setCreatedResult(null);
                setTitle("");
                setHint("");
                setContent("");
                setUnlockDateTime("");
              }}
              className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white underline underline-offset-4"
            >
              Write another message
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-mono font-medium text-neutral-800 dark:text-neutral-200 mb-4">
          <Clock className="w-3.5 h-3.5 text-[#65a30d] dark:text-[#ccff00]" />
          <span>Server-Enforced Time-Lock</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-neutral-900 dark:text-white tracking-tight">
          FutureMe
        </h1>
        <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 mt-3 leading-relaxed">
          Write a letter or message to your future self, friends, or team. It remains strictly encrypted and locked on the server until the exact moment arrives.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-xl space-y-5"
      >
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block">
            Message Title
          </label>
          <input
            type="text"
            required
            maxLength={100}
            placeholder="e.g. Read this after semester finals"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#ccff00] outline-none transition"
          />
        </div>

        {/* Recipient Hint */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block">
            Recipient / Hint (Visible while locked)
          </label>
          <input
            type="text"
            maxLength={120}
            placeholder="e.g. To my graduation self in 2027"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-[#ccff00] outline-none transition"
          />
        </div>

        {/* Date Time Picker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block">
              Unlock Date & Time (Your Local Time)
            </label>
            <span className="text-[11px] text-neutral-400 font-mono">
              Saved in UTC
            </span>
          </div>

          <div className="relative">
            <input
              type="datetime-local"
              required
              value={unlockDateTime}
              onChange={(e) => setUnlockDateTime(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-[#ccff00] cursor-pointer"
            />
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-neutral-400">Presets:</span>
            <button
              type="button"
              onClick={() => setQuickDate(1)}
              className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
            >
              +1 Day
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(7)}
              className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
            >
              +7 Days
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(30)}
              className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
            >
              +30 Days
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(365)}
              className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
            >
              +1 Year
            </button>
          </div>
        </div>

        {/* Message Content */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block">
              Message Body (Locked until release date)
            </label>
            <span className="text-[11px] text-neutral-400 font-mono">
              {content.length} / 20,000 chars
            </span>
          </div>
          <textarea
            rows={8}
            required
            maxLength={20000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your predictions, reflections, goals, or secrets here..."
            className="w-full p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-[#ccff00] resize-y"
          />
        </div>

        {/* Notice & Disclaimer */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-neutral-700 dark:text-neutral-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Honest Time-Lock Guarantee</span>
          </div>
          <p>
            The message content is withheld entirely on the server. No visitor or inspection of the network tab can read the content until the unlock moment passes. Note: This tool provides a shareable unlock link and does not send automated emails.
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-6 rounded-2xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-sm font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 active:scale-98 transition flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white dark:border-neutral-950 border-t-transparent animate-spin"></div>
              <span>Locking message into future...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-[#ccff00] dark:text-neutral-950" />
              <span>Lock & Create Share Link</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
