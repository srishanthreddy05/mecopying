"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
import Prism from "prismjs";

// Core prism bases MUST be imported first
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markup-templating";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-php";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-swift";
import "prismjs/components/prism-kotlin";

import { Check, Copy, Share2, WrapText } from "lucide-react";

interface CodeViewerProps {
  code: string;
  language: string;
  title?: string;
  hideHeader?: boolean;
}

export default function CodeViewer({
  code,
  language,
  title,
  hideHeader = false,
}: CodeViewerProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [wrapLines, setWrapLines] = useState(true);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const prismLang = language === "html" ? "markup" : language;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
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

  // Safe client-side highlighting with fallback
  const highlightedHtml = useMemo(() => {
    if (!mounted) return null;
    try {
      const grammar =
        Prism.languages[prismLang] ||
        Prism.languages.javascript ||
        Prism.languages.clike;
      if (grammar) {
        return Prism.highlight(code, grammar, prismLang);
      }
    } catch {
      // fallback
    }
    return null;
  }, [mounted, code, prismLang]);

  const lines = code.split("\n");
  const byteSize = new TextEncoder().encode(code).length;
  const sizeFormatted =
    byteSize < 1024 ? `${byteSize} B` : `${(byteSize / 1024).toFixed(1)} KB`;

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-[#0d0e11] text-neutral-100 shadow-lg overflow-hidden font-mono">
      {!hideHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#16171b] border-b border-neutral-800/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
            </div>
            {title && (
              <span className="text-xs font-semibold text-neutral-200 font-sans tracking-wide">
                {title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 font-mono hidden sm:inline">
              {lines.length} {lines.length === 1 ? "line" : "lines"} • {sizeFormatted}
            </span>

            <button
              onClick={() => setWrapLines(!wrapLines)}
              title={wrapLines ? "Disable wrap" : "Enable wrap"}
              className={`p-1.5 rounded-lg border text-xs transition ${
                wrapLines
                  ? "bg-neutral-800 border-neutral-700 text-[#ccff00]"
                  : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <WrapText className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 hover:text-white border border-neutral-700/60 transition active:scale-95"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-sans">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="font-sans">Copy Link</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ccff00] hover:bg-[#b8e600] text-neutral-950 text-xs font-semibold font-sans transition active:scale-95 shadow-sm"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 text-neutral-950" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-950" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Code Area with Line Numbers */}
      <div className="flex overflow-x-auto text-[13px] leading-relaxed p-4 select-text">
        {/* Line numbers */}
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

        {/* Code body with hydration suppression */}
        <pre
          suppressHydrationWarning
          className={`flex-1 m-0 p-0 bg-transparent overflow-visible ${
            wrapLines ? "whitespace-pre-wrap break-all" : "whitespace-pre"
          }`}
        >
          {highlightedHtml ? (
            <code
              suppressHydrationWarning
              className={`language-${prismLang}`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          ) : (
            <code suppressHydrationWarning className={`language-${prismLang}`}>{code}</code>
          )}
        </pre>
      </div>
    </div>
  );
}
