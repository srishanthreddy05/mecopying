"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import {
  QrCode,
  Download,
  Copy,
  Check,
  AlertCircle,
  Sliders,
} from "lucide-react";

function QRMeContent() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";

  const [url, setUrl] = useState(initialUrl);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [size, setSize] = useState<number>(360);
  const [darkColor, setDarkColor] = useState<string>("#111113");
  const [lightColor, setLightColor] = useState<string>("#ffffff");
  const [copiedUrl, setCopiedUrl] = useState(false);

  const trimmed = url.trim();

  // Derived URL validation during render
  const validationError = (() => {
    if (!trimmed || trimmed.length <= 3) return null;
    try {
      const parsed = new URL(trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`);
      return parsed.hostname ? null : "Please enter a valid URL (e.g. https://mecopying.in/srishanth)";
    } catch {
      return "Please enter a valid URL (e.g. https://mecopying.in/srishanth)";
    }
  })();

  // Generate QR code whenever URL or settings change
  useEffect(() => {
    let active = true;

    if (!trimmed) {
      Promise.resolve().then(() => {
        if (active) setQrDataUrl("");
      });
      return () => {
        active = false;
      };
    }

    const targetUrl = trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`;

    QRCode.toDataURL(targetUrl, {
      width: size,
      margin: 2,
      errorCorrectionLevel,
      color: {
        dark: darkColor,
        light: lightColor,
      },
    })
      .then((dataUri) => {
        if (active) setQrDataUrl(dataUri);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [trimmed, errorCorrectionLevel, size, darkColor, lightColor]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `mecopying-qr-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyUrl = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-mono font-medium text-neutral-800 dark:text-neutral-200 mb-4">
          <QrCode className="w-3.5 h-3.5 text-[#65a30d] dark:text-[#ccff00]" />
          <span>Local Browser Generator • Free & Instant</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-neutral-900 dark:text-white tracking-tight">
          QR Me
        </h1>
        <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 mt-3">
          Turn any URL into a crisp, high-resolution QR code. Download as PNG with no watermarks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Controls Column */}
        <div className="md:col-span-7 space-y-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-lg">
          {/* URL Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 block">
              Destination URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://mecopying.in/srishanth/algo"
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-[#ccff00] outline-none transition"
              />
              {url && (
                <button
                  onClick={() => setUrl("")}
                  className="absolute right-3 top-3.5 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  Clear
                </button>
              )}
            </div>

            {validationError && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{validationError}</span>
              </p>
            )}

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-neutral-400">Presets:</span>
              <button
                type="button"
                onClick={() => setUrl("https://mecopying.in")}
                className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
              >
                mecopying.in
              </button>
              <button
                type="button"
                onClick={() => setUrl("https://github.com")}
                className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
              >
                github.com
              </button>
            </div>
          </div>

          {/* Settings Customization */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
              <Sliders className="w-3.5 h-3.5" />
              <span>Customization Options</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Error Correction Level */}
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-600 dark:text-neutral-400 block font-medium">
                  Error Correction
                </label>
                <select
                  value={errorCorrectionLevel}
                  onChange={(e) => setErrorCorrectionLevel(e.target.value as "L" | "M" | "Q" | "H")}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none cursor-pointer"
                >
                  <option value="L">Low (7% recovery)</option>
                  <option value="M">Medium (15% recovery)</option>
                  <option value="Q">Quartile (25% recovery)</option>
                  <option value="H">High (30% recovery)</option>
                </select>
              </div>

              {/* Resolution Size */}
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-600 dark:text-neutral-400 block font-medium">
                  Export Size ({size}px)
                </label>
                <select
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none cursor-pointer"
                >
                  <option value={240}>Small (240x240)</option>
                  <option value={360}>Medium (360x360)</option>
                  <option value={512}>Large (512x512)</option>
                  <option value={800}>HD Print (800x800)</option>
                </select>
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-600 dark:text-neutral-400 block font-medium">
                  QR Pattern Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={darkColor}
                    onChange={(e) => setDarkColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-neutral-200 dark:border-neutral-700 bg-transparent"
                  />
                  <input
                    type="text"
                    value={darkColor}
                    onChange={(e) => setDarkColor(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-neutral-600 dark:text-neutral-400 block font-medium">
                  Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={lightColor}
                    onChange={(e) => setLightColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-neutral-200 dark:border-neutral-700 bg-transparent"
                  />
                  <input
                    type="text"
                    value={lightColor}
                    onChange={(e) => setLightColor(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview & Download Column */}
        <div className="md:col-span-5 flex flex-col items-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-lg text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4 block">
            Live Preview
          </span>

          <div className="w-64 h-64 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 flex items-center justify-center p-3 bg-neutral-50 dark:bg-neutral-950 shadow-inner">
            {qrDataUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qrDataUrl}
                alt="Generated QR Code"
                className="w-full h-full object-contain rounded-xl shadow-xs"
              />
            ) : (
              <div className="flex flex-col items-center text-neutral-400 p-4 space-y-2">
                <QrCode className="w-10 h-10 stroke-[1.5]" />
                <p className="text-xs">Enter a URL to generate your QR code</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-2 mt-6">
            <button
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="w-full py-3 px-4 rounded-xl bg-[#ccff00] hover:bg-[#b8e600] disabled:opacity-40 text-neutral-950 text-sm font-bold flex items-center justify-center gap-2 transition active:scale-98 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-neutral-950" />
              <span>Download PNG ({size}x{size})</span>
            </button>

            <button
              onClick={handleCopyUrl}
              disabled={!url}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? "Copied URL!" : "Copy Destination Link"}</span>
            </button>
          </div>

          <div className="mt-5 text-[11px] text-neutral-500 font-mono text-center">
            Standard static QR encoding • No telemetry or expiry
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QRMePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-neutral-500">Loading QR Me...</div>}>
      <QRMeContent />
    </Suspense>
  );
}
