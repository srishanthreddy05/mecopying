import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { deletePageWithPassword, deleteSnippetWithPassword, NotFoundError, UnauthorizedError } from "@/lib/data-service";
import { checkRateLimit } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const body = await req.json();
    const { slug, password, collectionSlug, snippetSlug } = body;

    const targetKey = collectionSlug && snippetSlug 
      ? `${collectionSlug}/${snippetSlug}` 
      : (slug || "unknown");

    // Per-target password brute-force protection (6 attempts / 15 min per target page)
    const targetRateLimit = checkRateLimit(`delete-target:${targetKey}:${ip}`, 6, 15 * 60 * 1000);
    // Global IP burst protection (40 attempts / 15 min)
    const ipRateLimit = checkRateLimit(`delete-ip:${ip}`, 40, 15 * 60 * 1000);

    if (!targetRateLimit.allowed || !ipRateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many deletion attempts. Please wait before trying again." },
        { status: 429 }
      );
    }

    if (!password || typeof password !== "string" || !password.trim()) {
      return NextResponse.json(
        { error: "Deletion password is required." },
        { status: 400 }
      );
    }

    if (collectionSlug && snippetSlug) {
      await deleteSnippetWithPassword(collectionSlug, snippetSlug, password.trim());
      revalidatePath(`/${collectionSlug}/${snippetSlug}`);
      revalidatePath(`/${collectionSlug}`);
      return NextResponse.json({
        success: true,
        message: "Snippet deleted successfully.",
      });
    }

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "Page slug is required." },
        { status: 400 }
      );
    }

    await deletePageWithPassword(slug, password.trim());
    revalidatePath(`/${slug}`);

    return NextResponse.json({
      success: true,
      message: "Page deleted successfully.",
    });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : "Failed to delete page";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
