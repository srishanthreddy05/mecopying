"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SUPPORTED_LANGUAGES,
  normalizeSlug,
  formatDisplayDate,
} from "@/lib/validations";
import {
  Key,
  PlusCircle,
  Trash2,
  Edit,
  ExternalLink,
  Copy,
  Check,
  Globe,
  EyeOff,
  Code2,
  AlertTriangle,
  X,
} from "lucide-react";

interface SnippetItem {
  id: string;
  slug: string;
  title: string;
  content: string;
  language: string;
  visibility: string;
  viewCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface CollectionData {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  visibility: string;
  expiresAt?: Date | string | null;
  createdAt: Date | string;
  snippets: SnippetItem[];
}

interface Props {
  initialCollection: CollectionData;
  token: string;
}

export default function ManageCollectionClient({ initialCollection, token }: Props) {
  const router = useRouter();
  const [collection, setCollection] = useState<CollectionData>(initialCollection);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Add Snippet Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newLanguage, setNewLanguage] = useState("typescript");
  const [newContent, setNewContent] = useState("");
  const [newVisibility, setNewVisibility] = useState<"PUBLIC" | "UNLISTED">("PUBLIC");
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Edit Snippet Modal State
  const [editingSnippet, setEditingSnippet] = useState<SnippetItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editLanguage, setEditLanguage] = useState("typescript");
  const [editContent, setEditContent] = useState("");
  const [editVisibility, setEditVisibility] = useState<"PUBLIC" | "UNLISTED">("PUBLIC");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Action State
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);

  const publicCollectionUrl = `/${collection.slug}`;

  const copyToClipboard = async (text: string, type: "public" | "token") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "public") {
        setCopiedPublic(true);
        setTimeout(() => setCopiedPublic(false), 2000);
      } else {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
      }
    } catch {
      // fallback
    }
  };

  // Add snippet handler
  const handleAddSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const normSlug = normalizeSlug(newSlug);
    if (!newTitle.trim()) {
      setAddError("Title is required.");
      return;
    }
    if (!normSlug) {
      setAddError("Valid snippet slug is required.");
      return;
    }
    if (!newContent.trim()) {
      setAddError("Code content is required.");
      return;
    }

    setIsSubmittingAdd(true);

    try {
      const res = await fetch("/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionSlug: collection.slug,
          slug: normSlug,
          title: newTitle.trim(),
          content: newContent,
          language: newLanguage,
          visibility: newVisibility,
          manageToken: token,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create snippet");
      }

      // Add to local state
      const createdItem: SnippetItem = {
        id: data.snippet.id,
        slug: data.snippet.slug,
        title: data.snippet.title,
        content: newContent,
        language: data.snippet.language,
        visibility: data.snippet.visibility,
        viewCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setCollection((prev) => ({
        ...prev,
        snippets: [createdItem, ...prev.snippets],
      }));

      // Reset form
      setNewTitle("");
      setNewSlug("");
      setNewContent("");
      setIsAdding(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error adding snippet";
      setAddError(msg);
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Open edit modal
  const handleOpenEdit = (snippet: SnippetItem) => {
    setEditingSnippet(snippet);
    setEditTitle(snippet.title);
    setEditLanguage(snippet.language);
    setEditContent(snippet.content);
    setEditVisibility(snippet.visibility as "PUBLIC" | "UNLISTED");
    setEditError(null);
  };

  // Save edit handler
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSnippet) return;
    setEditError(null);

    setIsSubmittingEdit(true);

    try {
      const res = await fetch(`/api/snippets/${collection.slug}/${editingSnippet.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manageToken: token,
          title: editTitle.trim(),
          language: editLanguage,
          content: editContent,
          visibility: editVisibility,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update snippet");
      }

      setCollection((prev) => ({
        ...prev,
        snippets: prev.snippets.map((s) =>
          s.id === editingSnippet.id
            ? {
                ...s,
                title: editTitle.trim(),
                language: editLanguage,
                content: editContent,
                visibility: editVisibility,
                updatedAt: new Date().toISOString(),
              }
            : s
        ),
      }));

      setEditingSnippet(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating snippet";
      setEditError(msg);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete snippet handler
  const handleDeleteSnippet = async (snippetSlug: string) => {
    if (!confirm(`Are you sure you want to delete snippet "${snippetSlug}"? This cannot be undone.`)) {
      return;
    }

    setDeletingSlug(snippetSlug);

    try {
      const res = await fetch(`/api/snippets/${collection.slug}/${snippetSlug}?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete snippet");
      }

      setCollection((prev) => ({
        ...prev,
        snippets: prev.snippets.filter((s) => s.slug !== snippetSlug),
      }));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete snippet");
    } finally {
      setDeletingSlug(null);
    }
  };

  // Delete entire collection handler
  const handleDeleteCollection = async () => {
    const confirmation = prompt(
      `Type the collection slug "${collection.slug}" to permanently delete this collection and all its snippets:`
    );

    if (confirmation !== collection.slug) {
      alert("Slug did not match. Deletion cancelled.");
      return;
    }

    setIsDeletingCollection(true);

    try {
      const res = await fetch(`/api/manage/${encodeURIComponent(token)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete collection");
      }

      alert("Collection permanently deleted.");
      router.push("/");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting collection");
      setIsDeletingCollection(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header Card */}
      <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100 dark:border-neutral-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                Owner Management Dashboard
              </span>
              <span className="text-xs text-neutral-500 font-mono">
                {collection.snippets.length} {collection.snippets.length === 1 ? "snippet" : "snippets"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
              /{collection.slug}
            </h1>
            <p className="text-sm text-neutral-500">
              {collection.title || `${collection.slug}'s Collection`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={publicCollectionUrl}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Public Page</span>
            </Link>

            <button
              onClick={() => copyToClipboard(typeof window !== "undefined" ? `${window.location.origin}${publicCollectionUrl}` : publicCollectionUrl, "public")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition"
            >
              {copiedPublic ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPublic ? "Copied Public!" : "Copy Public URL"}</span>
            </button>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ccff00] hover:bg-[#b8e600] text-neutral-950 text-xs font-bold transition active:scale-95 shadow-sm"
            >
              <PlusCircle className="w-4 h-4 text-neutral-950" />
              <span>{isAdding ? "Close Form" : "Add Snippet"}</span>
            </button>
          </div>
        </div>

        {/* Security Alert Banner */}
        <div className="mt-5 p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-300/80 dark:border-amber-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
            <Key className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Private Management URL:</strong> Anyone with this URL has edit/delete access to this collection. Bookmark this page now.
            </span>
          </div>

          <button
            onClick={() => copyToClipboard(window.location.href, "token")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition active:scale-95 whitespace-nowrap"
          >
            {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedToken ? "Copied!" : "Copy Private URL"}</span>
          </button>
        </div>
      </div>

      {/* Expandable Add Snippet Section */}
      {isAdding && (
        <form
          onSubmit={handleAddSnippet}
          className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xl space-y-4 animate-in slide-in-from-top-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-[#ccff00] dark:text-neutral-950" />
              <span>Add Snippet to /{collection.slug}</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {addError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-300 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Snippet Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Week 2 Homework Solution"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Language
              </label>
              <select
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Snippet Slug (URL path)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-neutral-400 font-mono text-sm">/</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. week2"
                  value={newSlug}
                  onChange={(e) => setNewSlug(normalizeSlug(e.target.value))}
                  className="w-full pl-6 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm font-mono outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Visibility
              </label>
              <select
                value={newVisibility}
                onChange={(e) => setNewVisibility(e.target.value as "PUBLIC" | "UNLISTED")}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm outline-none cursor-pointer"
              >
                <option value="PUBLIC">Public (Visible in collection listing)</option>
                <option value="UNLISTED">Unlisted (Hidden from listing, direct link only)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Code Content
            </label>
            <textarea
              rows={8}
              required
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="// Paste code here..."
              className="w-full p-3 font-mono text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-950 text-neutral-100 outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingAdd}
              className="px-5 py-2 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold transition disabled:opacity-50"
            >
              {isSubmittingAdd ? "Saving..." : "Save Snippet"}
            </button>
          </div>
        </form>
      )}

      {/* Snippets List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center justify-between">
          <span>All Snippets in Collection</span>
          <span className="text-xs text-neutral-500 font-mono font-normal">
            {collection.snippets.length} total
          </span>
        </h2>

        {collection.snippets.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-500 space-y-3">
            <Code2 className="w-10 h-10 mx-auto stroke-[1.5] text-neutral-400" />
            <p className="text-sm font-medium">No snippets in this collection yet.</p>
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 rounded-xl bg-[#ccff00] text-neutral-950 font-bold text-xs"
            >
              Add the first snippet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {collection.snippets.map((snip) => (
              <div
                key={snip.id}
                className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-neutral-300 dark:hover:border-neutral-700 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono text-[11px]">
                      {snip.language}
                    </span>
                    {snip.visibility === "PUBLIC" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <Globe className="w-3 h-3" />
                        Public
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        <EyeOff className="w-3 h-3" />
                        Unlisted
                      </span>
                    )}
                    <span className="text-xs text-neutral-400 font-mono">
                      /{collection.slug}/{snip.slug}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                    {snip.title}
                  </h4>
                  <p className="text-xs text-neutral-500 font-mono">
                    <span suppressHydrationWarning>Created {formatDisplayDate(snip.createdAt)}</span> • {snip.viewCount} views
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/${collection.slug}/${snip.slug}`}
                    className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition"
                    title="View public snippet"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => handleOpenEdit(snip)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white text-xs font-semibold transition"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDeleteSnippet(snip.slug)}
                    disabled={deletingSlug === snip.slug}
                    className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition disabled:opacity-50"
                    title="Delete snippet"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone: Delete Collection */}
      <div className="p-6 rounded-3xl border border-rose-200 dark:border-rose-900/40 bg-rose-500/5 dark:bg-rose-500/10 space-y-3">
        <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Danger Zone</span>
        </h3>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          Permanently delete collection <code className="font-mono font-bold">/{collection.slug}</code> and all associated snippets. This cannot be undone.
        </p>
        <button
          onClick={handleDeleteCollection}
          disabled={isDeletingCollection}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50"
        >
          {isDeletingCollection ? "Deleting..." : "Delete entire collection"}
        </button>
      </div>

      {/* Edit Snippet Modal */}
      {editingSnippet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingSnippet(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
              Edit Snippet: /{collection.slug}/{editingSnippet.slug}
            </h3>

            {editError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-300 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Language
                  </label>
                  <select
                    value={editLanguage}
                    onChange={(e) => setEditLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm outline-none cursor-pointer"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Visibility
                </label>
                <select
                  value={editVisibility}
                  onChange={(e) => setEditVisibility(e.target.value as "PUBLIC" | "UNLISTED")}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm outline-none cursor-pointer"
                >
                  <option value="PUBLIC">Public (Visible on collection page)</option>
                  <option value="UNLISTED">Unlisted (Accessible by exact URL only)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Code
                </label>
                <textarea
                  rows={10}
                  required
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3 font-mono text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-950 text-neutral-100 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSnippet(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold transition disabled:opacity-50"
                >
                  {isSubmittingEdit ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
