import { NextRequest, NextResponse } from "next/server";
import { updateSnippetSchema } from "@/lib/validations";
import {
  getSnippet,
  updateSnippet,
  deleteSnippet,
  UnauthorizedError,
  NotFoundError,
} from "@/lib/data-service";

interface RouteParams {
  params: Promise<{
    collection: string;
    snippet: string;
  }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { collection, snippet } = await params;

  try {
    const data = await getSnippet(collection, snippet);
    if (!data) {
      return NextResponse.json({ error: "Snippet not found or expired" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      snippet: {
        id: data.id,
        slug: data.slug,
        title: data.title,
        content: data.content,
        language: data.language,
        visibility: data.visibility,
        viewCount: data.viewCount,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        collection: data.collection,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching snippet";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { collection, snippet } = await params;

  try {
    const rawBody = await req.json();
    const parsed = updateSnippetSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const updated = await updateSnippet({
      collectionSlug: collection,
      snippetSlug: snippet,
      manageToken: parsed.data.manageToken,
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        language: parsed.data.language,
        visibility: parsed.data.visibility as "PUBLIC" | "UNLISTED" | undefined,
      },
    });

    return NextResponse.json({ success: true, snippet: updated });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : "Error updating snippet";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { collection, snippet } = await params;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || (await req.json().catch(() => ({})))?.manageToken;

  if (!token) {
    return NextResponse.json({ error: "Management token is required" }, { status: 401 });
  }

  try {
    await deleteSnippet({
      collectionSlug: collection,
      snippetSlug: snippet,
      manageToken: token,
    });

    return NextResponse.json({ success: true, message: "Snippet deleted successfully" });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : "Error deleting snippet";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
