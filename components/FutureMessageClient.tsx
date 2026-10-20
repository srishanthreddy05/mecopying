"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Lock,
  Unlock,
  Clock,
  Sparkles,
  Share2,
  Check,
  Flag,
} from "lucide-react";
import ReportModal from "@/components/ReportModal";
import { formatDisplayDate } from "@/lib/validations";

interface FutureMessageData {
  id: string;
  slug: string;
  title: string;
  hint: string | null;
  unlockAt: Date | string;
  createdAt: Date | string;
  isLocked: boolean;
  content: string | null;
}

interface Props {
  initialData: FutureMessageData;
}

export default function FutureMessageClient({ initialData }: Props) {
  const [data, setData] = useState<FutureMessageData>(initialData);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 });

  const [copiedLink, setCopiedLink] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const unlockTimeMs = new Date(data.unlockAt).getTime();

  useEffect(() => {
    if (!data.isLocked) return;

    const calculate = () => {
      const now = Date.now();
      const diff = unlockTimeMs - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
        // Poll server for unlocked content
        fetch(`/api/futureme/${data.slug}`)
          .then((res) => res.json())
          .then((resData) => {
            if (resData.success && resData.message) {
              setData(resData.message);
            }
          })
          .catch(() => {});
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, totalMs: diff });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [data.isLocked, data.slug, unlockTimeMs]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  // LOCKED STATE SCREEN
  if (data.isLocked) {
    return (
      <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-10 shadow-xl text-center space-y-8 animate-in fade-in">
        {/* Animated Lock Icon */}
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-3xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white shadow-inner mx-auto">
            <Lock className="w-10 h-10 text-amber-500 animate-pulse" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
          </span>
        </div>

        {/* Title and Hint */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Time-Locked Capsule
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
            {data.title}
          </h1>
          {data.hint && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 italic">
              &ldquo;{data.hint}&rdquo;
            </p>
          )}
        </div>

        {/* Live Countdown Grid */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-md mx-auto">
          <div className="p-3 sm:p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
            <div className="text-2xl sm:text-4xl font-black font-mono text-neutral-900 dark:text-white">
              {timeLeft.days}
            </div>
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-neutral-500 font-bold mt-1">
              Days
            </div>
          </div>
          <div className="p-3 sm:p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
            <div className="text-2xl sm:text-4xl font-black font-mono text-neutral-900 dark:text-white">
              {String(timeLeft.hours).padStart(2, "0")}
            </div>
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-neutral-500 font-bold mt-1">
              Hours
            </div>
          </div>
          <div className="p-3 sm:p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
            <div className="text-2xl sm:text-4xl font-black font-mono text-neutral-900 dark:text-white">
              {String(timeLeft.minutes).padStart(2, "0")}
            </div>
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-neutral-500 font-bold mt-1">
              Mins
            </div>
          </div>
          <div className="p-3 sm:p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
            <div className="text-2xl sm:text-4xl font-black font-mono text-[#65a30d] dark:text-[#ccff00]">
              {String(timeLeft.seconds).padStart(2, "0")}
            </div>
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-neutral-500 font-bold mt-1">
              Secs
            </div>
          </div>
        </div>

        {/* Exact unlock time */}
        <div className="text-xs text-neutral-500 font-mono space-y-1">
          <p>
            Unlocks on <strong className="text-neutral-700 dark:text-neutral-300">{new Date(data.unlockAt).toLocaleString()}</strong>
          </p>
          <p className="text-[11px] text-neutral-400">
            The message body is securely withheld on our server and cannot be viewed in browser source.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:opacity-90 active:scale-95 transition"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Link Copied!" : "Copy Countdown Link"}</span>
          </button>

          <Link
            href="/futureme"
            className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
          >
            Write a FutureMe message
          </Link>
        </div>
      </div>
    );
  }

  // UNLOCKED STATE SCREEN
  return (
    <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-xl text-left space-y-6 animate-in zoom-in-95">
      {/* Unlocked Banner */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#ccff00]/15 border border-[#ccff00]/40 text-neutral-950 dark:text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ccff00] text-neutral-950 flex items-center justify-center font-bold">
            <Unlock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Time Capsule Unlocked!</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400" suppressHydrationWarning>
              Unlocked on {formatDisplayDate(data.unlockAt)}
            </p>
          </div>
        </div>
        <Sparkles className="w-5 h-5 text-[#65a30d] dark:text-[#ccff00]" />
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
          {data.title}
        </h1>
        {data.hint && (
          <p className="text-xs text-neutral-500 font-mono mt-1">
            Hint: {data.hint}
          </p>
        )}
      </div>

      {/* Message Body */}
      <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 leading-relaxed text-sm whitespace-pre-wrap select-text font-sans">
        {data.content}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Copied!" : "Share Link"}</span>
          </button>
        </div>

        <button
          onClick={() => setIsReportOpen(true)}
          className="flex items-center gap-1 hover:text-rose-500 transition"
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Report message</span>
        </button>
      </div>

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType="FUTURE_MESSAGE"
        targetId={data.slug}
      />
    </div>
  );
}
