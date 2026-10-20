import { NextRequest, NextResponse } from "next/server";
import { createSnippetSchema } from "@/lib/validations";
import {
  addSnippetToCollection,
  DuplicateSlugError,
  UnauthorizedError,
  NotFoundError,
} from "@/lib/data-service";
import { checkRateLimit } from "@/lib/security";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  const rateLimit = checkRateLimit(`snippet-create:${ip}`, 30, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const rawBody = await req.json();
    const parsed = createSnippetSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    if (!parsed.data.manageToken) {
      return NextResponse.json(
        { error: "Management token is required to add snippets to an existing collection" },
        { status: 401 }
      );
    }

    const result = await addSnippetToCollection({
      collectionSlug: parsed.data.collectionSlug,
      slug: parsed.data.slug,
      title: parsed.data.title,
      content: parsed.data.content,
      language: parsed.data.language,
      visibility: parsed.data.visibility,
      expiresInSeconds: parsed.data.expiresInSeconds,
      manageToken: parsed.data.manageToken,
    });

    const origin = req.nextUrl.origin;
    const snippetUrl = `${origin}/${result.collection.slug}/${result.snippet.slug}`;

    return NextResponse.json(
      {
        success: true,
        snippet: {
          id: result.snippet.id,
          slug: result.snippet.slug,
          title: result.snippet.title,
          language: result.snippet.language,
          visibility: result.snippet.visibility,
        },
        snippetUrl,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof DuplicateSlugError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Failed to add snippet";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
