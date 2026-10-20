import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createCollectionSchema,
  snippetSlugSchema,
  SUPPORTED_LANGUAGES,
  MAX_SNIPPET_SIZE_BYTES,
} from "@/lib/validations";
import {
  createCollectionWithSnippet,
  DuplicateSlugError,
} from "@/lib/data-service";
import { generateManagementToken, checkRateLimit } from "@/lib/security";

const createPayloadSchema = z.object({
  collection: createCollectionSchema.omit({ slug: true }),
  collectionSlug: createCollectionSchema.shape.slug,
  snippet: z
    .object({
      slug: snippetSlugSchema,
      title: z.string().trim().min(1, "Snippet title is required").max(100),
      content: z
        .string()
        .min(1, "Code content is required")
        .refine((val) => new TextEncoder().encode(val).length <= MAX_SNIPPET_SIZE_BYTES, {
          message: `Snippet code exceeds 50 KB`,
        }),
      language: z.enum(SUPPORTED_LANGUAGES.map((l) => l.id) as [string, ...string[]]).default("typescript"),
      visibility: z.enum(["PUBLIC", "UNLISTED"]).default("PUBLIC"),
      expiresInSeconds: z.number().int().nonnegative().optional().nullable(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "anonymous";
  const rateLimit = checkRateLimit(`collection-create:${ip}`, 15, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many creation requests. Please wait a minute." },
      { status: 429 }
    );
  }

  try {
    const rawBody = await req.json();
    const parsed = createPayloadSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { collection, collectionSlug, snippet } = parsed.data;
    const manageToken = generateManagementToken();

    const result = await createCollectionWithSnippet({
      collection: {
        slug: collectionSlug,
        title: collection.title,
        description: collection.description,
        visibility: collection.visibility,
        manageToken,
        expiresInSeconds: collection.expiresInSeconds,
      },
      snippet: snippet
        ? {
            slug: snippet.slug,
            title: snippet.title,
            content: snippet.content,
            language: snippet.language,
            visibility: snippet.visibility,
            expiresInSeconds: snippet.expiresInSeconds,
          }
        : undefined,
    });

    const origin = req.nextUrl.origin;
    const publicUrl = `${origin}/${result.collection.slug}`;
    const snippetUrl = result.snippet ? `${origin}/${result.collection.slug}/${result.snippet.slug}` : null;
    const manageUrl = `${origin}/manage/${manageToken}`;

    return NextResponse.json(
      {
        success: true,
        collection: {
          id: result.collection.id,
          slug: result.collection.slug,
          title: result.collection.title,
          visibility: result.collection.visibility,
        },
        snippet: result.snippet
          ? {
              id: result.snippet.id,
              slug: result.snippet.slug,
              title: result.snippet.title,
              language: result.snippet.language,
              visibility: result.snippet.visibility,
            }
          : null,
        urls: {
          publicUrl,
          snippetUrl,
          manageUrl,
        },
        manageToken,
        securityNotice:
          "Save your private management link now! Anyone with this link can edit or delete this collection and its snippets. We do not store plain management tokens, so lost links cannot be recovered.",
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err instanceof DuplicateSlugError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Failed to create collection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
