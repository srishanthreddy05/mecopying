import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSnippet } from "@/lib/data-service";
import { RESERVED_SLUGS, SLUG_REGEX } from "@/lib/validations";
import MinimalSharedPage from "@/components/MinimalSharedPage";
import type { Metadata } from "next";

export const instant = false;

interface PageProps {
  params: Promise<{
    collection: string;
    snippet: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connection();
  const { collection, snippet } = await params;
  if (!collection || collection.includes(".") || RESERVED_SLUGS.has(collection) || !SLUG_REGEX.test(collection)) {
    return { title: "Not Found | Mecopying" };
  }
  const data = await getSnippet(collection, snippet);

  if (!data) {
    return { title: "Page Not Found | Mecopying" };
  }

  return {
    title: `${data.title || snippet} | /${collection}/${snippet}`,
    description: `View shared content at mecopying.in/${collection}/${snippet}`,
    openGraph: {
      title: `${data.title || snippet} — /${collection}/${snippet}`,
      description: `View shared content on Mecopying.in`,
    },
  };
}

export default async function SnippetPage({ params }: PageProps) {
  await connection();
  const { collection: colSlug, snippet: snipSlug } = await params;
  if (
    !colSlug ||
    colSlug.includes(".") ||
    RESERVED_SLUGS.has(colSlug) ||
    !SLUG_REGEX.test(colSlug) ||
    !snipSlug ||
    snipSlug.includes(".") ||
    !SLUG_REGEX.test(snipSlug)
  ) {
    notFound();
  }
  const snippetData = await getSnippet(colSlug, snipSlug);

  if (!snippetData) {
    notFound();
  }

  return (
    <MinimalSharedPage
      page={{
        id: snippetData.id,
        slug: snippetData.slug,
        title: snippetData.title,
        content: snippetData.content,
        createdAt: snippetData.createdAt,
        expiresAt: snippetData.expiresAt,
        viewCount: snippetData.viewCount,
        collectionSlug: snippetData.collection.slug,
        snippetSlug: snippetData.slug,
      }}
    />
  );
}
