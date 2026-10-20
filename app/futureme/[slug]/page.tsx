import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getFutureMessage } from "@/lib/data-service";
import FutureMessageClient from "@/components/FutureMessageClient";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const data = await getFutureMessage(slug);

  if (!data) {
    return { title: "Message Not Found | Mecopying" };
  }

  // Pre-unlock pages must have noindex
  if (data.isLocked) {
    return {
      title: `Locked Message: ${data.title} | FutureMe`,
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${data.title} | FutureMe`,
    description: `A message unlocked on Mecopying.in`,
  };
}

async function FutureMessageContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await paramsPromise;
  const data = await getFutureMessage(slug);

  if (!data) {
    notFound();
  }

  return <FutureMessageClient initialData={data} />;
}

export default function FutureMessagePage({ params }: PageProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <Suspense
        fallback={
          <div className="space-y-6 animate-pulse">
            <div className="h-10 w-64 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
            <div className="h-64 w-full bg-neutral-100 dark:bg-neutral-900 rounded-3xl"></div>
          </div>
        }
      >
        <FutureMessageContent paramsPromise={params} />
      </Suspense>
    </div>
  );
}
