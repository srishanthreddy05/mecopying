import { NextRequest, NextResponse } from "next/server";
import {
  getCollectionForManagement,
  deleteCollection,
  UnauthorizedError,
} from "@/lib/data-service";

interface RouteParams {
  params: Promise<{
    token: string;
  }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  if (!token || token.trim().length === 0) {
    return NextResponse.json({ error: "Management token required" }, { status: 400 });
  }

  try {
    const collection = await getCollectionForManagement(token);
    if (!collection) {
      return NextResponse.json({ error: "Invalid or expired management token" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      collection,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error accessing collection management";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Management token required" }, { status: 400 });
  }

  try {
    const collection = await getCollectionForManagement(token);
    if (!collection) {
      return NextResponse.json({ error: "Invalid management token" }, { status: 404 });
    }

    await deleteCollection(collection.slug, token);

    return NextResponse.json({
      success: true,
      message: `Collection "${collection.slug}" and all its snippets were permanently deleted.`,
    });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Error deleting collection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
