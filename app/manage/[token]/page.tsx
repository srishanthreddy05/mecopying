import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCollectionForManagement } from "@/lib/data-service";
import ManageCollectionClient from "@/components/ManageCollectionClient";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export const metadata: Metadata = {
  title: "Collection Management | Mecopying",
  robots: {
    index: false,
    follow: false,
  },
};

async function ManageContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await paramsPromise;
  const collection = await getCollectionForManagement(token);

  if (!collection) {
    notFound();
  }

  return <ManageCollectionClient initialCollection={collection} token={token} />;
}

export default function ManagePage({ params }: PageProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <Suspense
        fallback={
          <div className="space-y-6 animate-pulse">
            <div className="h-10 w-64 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
            <div className="h-64 w-full bg-neutral-100 dark:bg-neutral-900 rounded-3xl"></div>
          </div>
        }
      >
        <ManageContent paramsPromise={params} />
      </Suspense>
    </div>
  );
}
