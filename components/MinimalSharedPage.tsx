"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDisplayDate, MAX_SNIPPET_SIZE_BYTES } from "@/lib/validations";
import {
  Copy,
  Check,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  WrapText,
  Pencil,
  X,
  Save,
  CheckCircle2,
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

  // Snippet content & title state
  const [content, setContent] = useState(page.content);
  const [title, setTitle] = useState(page.title || "");

  // Copy states
  const [copiedContent, setCopiedContent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [wrapLines, setWrapLines] = useState(true);

  // Delete modal states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Edit password modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isVerifyingEdit, setIsVerifyingEdit] = useState(false);
  const [editVerifyError, setEditVerifyError] = useState<string | null>(null);

  // Edit mode & form states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editToken, setEditToken] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const lines = content.split("\n");
  const byteSize = new TextEncoder().encode(content).length;
  const sizeFormatted =
    byteSize < 1024 ? `${byteSize} B` : `${(byteSize / 1024).toFixed(1)} KB`;

  const editBytes = new TextEncoder().encode(editContent).length;
  const editLines = editContent ? editContent.split("\n").length : 0;
  const editSizeFormatted =
    editBytes < 1024 ? `${editBytes} B` : `${(editBytes / 1024).toFixed(1)} KB`;

  const displayPath =
    page.collectionSlug && page.snippetSlug
      ? `/${page.collectionSlug}/${page.snippetSlug}`
      : `/${page.slug}`;

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
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

  const handleEditPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditVerifyError(null);

    const trimmed = editPassword.trim();
    if (!trimmed) {
      setEditVerifyError("Please enter the deletion password.");
      return;
    }

    setIsVerifyingEdit(true);

    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          slug: page.slug,
          collectionSlug: page.collectionSlug,
          snippetSlug: page.snippetSlug,
          password: trimmed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Incorrect password. Please try again.");
      }

      setEditToken(data.token);
      setEditTitle(data.snippet?.title ?? title);
      setEditContent(data.snippet?.content ?? content);
      setIsEditModalOpen(false);
      setEditPassword("");
      setEditVerifyError(null);
      setIsEditMode(true);
    } catch (err: unknown) {
      setEditVerifyError(err instanceof Error ? err.message : "Failed to verify password.");
    } finally {
      setIsVerifyingEdit(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editToken) {
      setSaveError("Edit session has expired. Please verify your password again.");
      return;
    }

    if (!editContent.trim()) {
      setSaveError("Content cannot be empty.");
      return;
    }

    const currentBytes = new TextEncoder().encode(editContent).length;
    if (currentBytes > MAX_SNIPPET_SIZE_BYTES) {
      setSaveError(`Content exceeds the maximum 50 KB limit (${currentBytes} / ${MAX_SNIPPET_SIZE_BYTES} bytes).`);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          token: editToken,
          title: editTitle.trim(),
          content: editContent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save changes.");
      }

      setTitle(data.snippet?.title ?? editTitle.trim());
      setContent(data.snippet?.content ?? editContent);
      setIsEditMode(false);
      setEditToken(null);
      setSuccessMessage("Snippet updated successfully!");
      setTimeout(() => setSuccessMessage(null), 4000);
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditToken(null);
    setSaveError(null);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      const indent = "  "; // 2 spaces
      const newVal = val.substring(0, start) + indent + val.substring(end);
      setEditContent(newVal);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + indent.length;
      }, 0);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-neutral-900 selection:bg-[#ccff00] selection:text-neutral-950 font-sans">
      {/* 1. COMPACT MINIMAL HEADER */}
      <header className="border-b border-neutral-200 bg-white/95 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo & Path */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 group transition"
              title="Mecopying home"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#ccff00] group-hover:scale-125 transition-transform"></span>
              <span className="font-bold text-sm tracking-tight text-neutral-900 font-sans">
                mecopying
              </span>
            </Link>

            <span className="text-neutral-300 font-mono text-xs">/</span>

            <span className="font-mono text-xs text-neutral-600 truncate max-w-[180px] sm:max-w-sm">
              {displayPath}
            </span>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 hover:text-neutral-900 font-sans font-medium transition active:scale-95 cursor-pointer shadow-xs"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Copy link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT SECTION */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-4">
        {/* Success Alert Banner */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-950 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* EDIT MODE FORM */}
        {isEditMode ? (
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#ccff00]/25 border border-[#ccff00] text-neutral-900 flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4 text-neutral-950" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900">Editing {displayPath}</h2>
                  <p className="text-xs text-neutral-500">Update title and content. The URL stays unchanged.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition cursor-pointer"
                title="Cancel editing"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {saveError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="edit-title-input" className="block text-xs font-semibold text-neutral-700">
                  Title <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <input
                  id="edit-title-input"
                  type="text"
                  maxLength={100}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Give this snippet a title..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#ccff00] focus:border-neutral-400 focus:bg-white transition"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="edit-content-input" className="font-semibold text-neutral-700">
                    Content / Code <span className="text-rose-500">*</span>
                  </label>
                  <span className={`font-mono text-xs ${editBytes > MAX_SNIPPET_SIZE_BYTES ? "text-rose-600 font-bold" : "text-neutral-500"}`}>
                    {editLines} {editLines === 1 ? "line" : "lines"} • {editSizeFormatted} / 50 KB
                  </span>
                </div>
                <textarea
                  id="edit-content-input"
                  required
                  rows={16}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder="Paste or write your content here..."
                  className="w-full p-4 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 font-mono text-[13px] leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-[#ccff00] focus:border-neutral-400 focus:bg-white transition resize-y select-text"
                  spellCheck={false}
                />
                <p className="text-[11px] text-neutral-500">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 font-mono text-[10px]">Tab</kbd> to indent code. Exact whitespace, tabs, and line breaks are preserved.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !editContent.trim() || editBytes > MAX_SNIPPET_SIZE_BYTES}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ccff00] hover:bg-[#b8e600] text-neutral-950 text-xs font-bold transition active:scale-95 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 text-neutral-950" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* STANDARD VIEW MODE */
          <>
            {/* Title if one exists */}
            {title && title.trim().length > 0 && (
              <div className="pb-2">
                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight break-words font-sans">
                  {title}
                </h1>
                <p className="text-xs text-neutral-500 font-mono mt-1" suppressHydrationWarning>
                  Published on {formatDisplayDate(page.createdAt)}
                </p>
              </div>
            )}

            {/* Code / Text Viewer Box */}
            <div className="rounded-2xl border border-neutral-200 bg-[#f8f8f8] shadow-xs overflow-hidden font-mono">
              {/* Panel Header Toolbar */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-400 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"></span>
                  <span className="text-xs text-neutral-500 font-mono ml-2">
                    {lines.length} {lines.length === 1 ? "line" : "lines"} • {sizeFormatted}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWrapLines(!wrapLines)}
                    title={wrapLines ? "Disable wrap" : "Enable wrap"}
                    className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                      wrapLines
                        ? "bg-neutral-100 border-neutral-300 text-neutral-900 font-semibold"
                        : "bg-white border-neutral-200 text-neutral-500 hover:text-neutral-900"
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
              <div className="flex overflow-x-auto text-[13px] leading-relaxed p-4 sm:p-6 select-text bg-[#f8f8f8]">
                {/* Line numbers gutter */}
                <div
                  className="select-none text-right pr-4 text-neutral-400 font-mono border-r border-neutral-200 mr-4 text-xs"
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
                  className={`flex-1 m-0 p-0 bg-transparent overflow-visible text-neutral-900 ${
                    wrapLines ? "whitespace-pre-wrap break-all" : "whitespace-pre overflow-x-auto"
                  }`}
                >
                  <code className="block select-text font-mono text-[13px]">{content}</code>
                </pre>
              </div>
            </div>
          </>
        )}
      </main>

      {/* 3. COMPACT FOOTER */}
      <footer className="border-t border-neutral-200 bg-white py-6 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-neutral-500">
          <Link
            href="/"
            className="flex items-center gap-1.5 hover:text-neutral-900 transition group text-neutral-600"
          >
            <span>Made with</span>
            <span className="font-bold text-neutral-900 group-hover:text-neutral-700 transition">
              Mecopying
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => {
                setEditVerifyError(null);
                setEditPassword("");
                setIsEditModalOpen(true);
              }}
              className="flex items-center gap-1 text-neutral-600 hover:text-neutral-950 transition cursor-pointer text-xs font-medium"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            <button
              onClick={() => {
                setDeleteError(null);
                setDeletePassword("");
                setIsDeleteOpen(true);
              }}
              className="flex items-center gap-1 text-neutral-600 hover:text-rose-600 transition cursor-pointer text-xs font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </footer>

      {/* 4. PASSWORD MODAL FOR EDITING */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl space-y-5 text-neutral-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-dialog-title"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-neutral-100 border border-neutral-200 text-neutral-800 flex items-center justify-center shrink-0">
                <Pencil className="w-5 h-5 text-neutral-800" />
              </div>
              <div>
                <h3 id="edit-dialog-title" className="text-lg font-bold text-neutral-900">
                  Edit this snippet
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Enter the password set when this page was created.
                </p>
              </div>
            </div>

            {editVerifyError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{editVerifyError}</span>
              </div>
            )}

            <form onSubmit={handleEditPasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-password-input"
                  className="block text-xs font-semibold text-neutral-700"
                >
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 select-none pointer-events-none" />
                  <input
                    id="edit-password-input"
                    type={showEditPassword ? "text" : "password"}
                    required
                    autoFocus
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#ccff00] focus:border-neutral-400 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    tabIndex={-1}
                    className="absolute right-3 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500">
                  The same password used for editing and deleting this page.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isVerifyingEdit}
                  className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-700 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isVerifyingEdit || !editPassword.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ccff00] hover:bg-[#b8e600] text-neutral-950 text-xs font-bold transition active:scale-95 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isVerifyingEdit ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Continue</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. SECURE DELETION MODAL */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl space-y-5 text-neutral-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 id="delete-dialog-title" className="text-lg font-bold text-neutral-900">
                  Delete this page?
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  This action permanently deletes this content.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{deleteError}</span>
              </div>
            )}

            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="del-password-input"
                  className="block text-xs font-semibold text-neutral-700"
                >
                  Deletion password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 select-none pointer-events-none" />
                  <input
                    id="del-password-input"
                    type={showDeletePassword ? "text" : "password"}
                    required
                    autoFocus
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter deletion password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-400 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    tabIndex={-1}
                    className="absolute right-3 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Enter the password set when this page was created.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-700 transition cursor-pointer"
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
