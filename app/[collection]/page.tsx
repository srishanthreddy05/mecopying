import { notFound } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { getStandalonePage } from "@/lib/data-service";
import { RESERVED_SLUGS, SLUG_REGEX, formatDisplayDate } from "@/lib/validations";
import MinimalSharedPage from "@/components/MinimalSharedPage";
import {
  Globe,
  ExternalLink,
  PlusCircle,
  Key,
  FolderOpen,
} from "lucide-react";
import type { Metadata } from "next";

export const instant = false;

interface PageProps {
  params: Promise<{
    collection: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connection();
  const { collection } = await params;
  if (!collection || collection.includes(".") || RESERVED_SLUGS.has(collection) || !SLUG_REGEX.test(collection)) {
    return { title: "Not Found | Mecopying" };
  }
  const page = await getStandalonePage(collection);

  if (!page) {
    return { title: "Page Not Found | Mecopying" };
  }

  return {
    title: page.title ? `${page.title} | Mecopying` : `/${page.slug} | Mecopying`,
    description: page.title ? `${page.title} — shared on Mecopying.in` : `Shared content on Mecopying.in`,
    openGraph: {
      title: page.title ? `${page.title} | Mecopying` : `/${page.slug} | Mecopying`,
      description: `View shared content at mecopying.in/${page.slug}`,
    },
  };
}

export default async function CollectionPage({ params }: PageProps) {
  await connection();
  const { collection: rawSlug } = await params;

  if (!rawSlug || rawSlug.includes(".") || RESERVED_SLUGS.has(rawSlug) || !SLUG_REGEX.test(rawSlug)) {
    notFound();
  }

  const page = await getStandalonePage(rawSlug);

  if (!page) {
    notFound();
  }

  // 1. Single page / standalone snippet -> Dedicated Minimal Shared Layout
  if (!page.isMultiSnippet) {
    return (
      <MinimalSharedPage
        page={{
          id: page.id,
          slug: page.slug,
          title: page.title,
          content: page.content,
          createdAt: page.createdAt,
          expiresAt: page.expiresAt,
          viewCount: page.viewCount,
        }}
      />
    );
  }

  // 2. Legacy multi-snippet collection view
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      {/* Header Banner */}
      <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-xl mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100 dark:border-neutral-800">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium">
              <Globe className="w-3.5 h-3.5" />
              <span>Collection</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">
              /{page.slug}
            </h1>
            {page.title && (
              <p className="text-base text-neutral-600 dark:text-neutral-400">
                {page.title}
              </p>
            )}
            {page.description && (
              <p className="text-xs text-neutral-500 max-w-xl">
                {page.description}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:items-end gap-2 text-xs text-neutral-500 font-mono">
            <span suppressHydrationWarning>Created {formatDisplayDate(page.createdAt)}</span>
            <span className="font-bold text-neutral-900 dark:text-white text-sm">
              {page.snippets.length} {page.snippets.length === 1 ? "snippet" : "snippets"}
            </span>
          </div>
        </div>

        <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
          <p className="flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Multi-snippet collection</span>
          </p>
          <Link
            href="/#create"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#ccff00] dark:text-white" />
            <span>Create new link</span>
          </Link>
        </div>
      </div>

      {/* Snippet Grid */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-[#65a30d] dark:text-[#ccff00]" />
          <span>Snippets in /{page.slug}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {page.snippets.map((snip) => (
            <Link
              key={snip.id}
              href={`/${page.slug}/${snip.slug}`}
              className="group p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono text-neutral-400 group-hover:text-[#65a30d] dark:group-hover:text-[#ccff00] transition flex items-center gap-1">
                    /{page.slug}/{snip.slug}
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </div>

                <h3 className="text-base font-bold text-neutral-900 dark:text-white group-hover:text-[#65a30d] dark:group-hover:text-[#ccff00] transition line-clamp-1 mb-2">
                  {snip.title || snip.slug}
                </h3>

                <div className="p-3 rounded-xl bg-neutral-950 font-mono text-[11px] text-neutral-300 line-clamp-3 leading-relaxed overflow-hidden">
                  {snip.content}
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span suppressHydrationWarning>{formatDisplayDate(snip.createdAt)}</span>
                <span>{snip.viewCount} views</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
