import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  verifySnippetEditPassword,
  updateSnippetContent,
  NotFoundError,
  UnauthorizedError,
} from "@/lib/data-service";
import {
  createEditToken,
  verifyEditToken,
  checkRateLimit,
} from "@/lib/security";
import { editVerifySchema, editSaveSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const body = await req.json();

    // 1. SAVE EDIT FLOW (if action is save or token is provided)
    if (body.action === "save" || body.token) {
      const ipLimit = checkRateLimit(`edit-save-ip:${ip}`, 30, 10 * 60 * 1000);
      if (!ipLimit.allowed) {
        return NextResponse.json(
          { error: "Too many edit requests. Please slow down." },
          { status: 429 }
        );
      }

      const parsed = editSaveSchema.safeParse(body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
        return NextResponse.json({ error: errorMsg }, { status: 400 });
      }

      const { token, title, content } = parsed.data;
      const verified = verifyEditToken(token);
      if (!verified.valid || !verified.snippetId) {
        return NextResponse.json(
          { error: verified.error || "Invalid or expired edit session. Please verify your password again." },
          { status: 401 }
        );
      }

      const updated = await updateSnippetContent({
        snippetId: verified.snippetId,
        title,
        content,
      });

      if (verified.collectionSlug && verified.snippetSlug) {
        revalidatePath(`/${verified.collectionSlug}/${verified.snippetSlug}`);
        revalidatePath(`/${verified.collectionSlug}`);
      } else if (verified.slug) {
        revalidatePath(`/${verified.slug}`);
      }

      return NextResponse.json({
        success: true,
        message: "Snippet updated successfully.",
        snippet: {
          id: updated.id,
          title: updated.title,
          content: updated.content,
          updatedAt: updated.updatedAt,
        },
      });
    }

    // 2. VERIFY PASSWORD FLOW (action === "verify" or default)
    const targetKey =
      body.collectionSlug && body.snippetSlug
        ? `${body.collectionSlug}/${body.snippetSlug}`
        : body.slug || "unknown";

    // Rate-limit password verification (6 attempts per 15 min per target page)
    const targetLimit = checkRateLimit(`edit-target:${targetKey}:${ip}`, 6, 15 * 60 * 1000);
    // Global IP protection (40 attempts per 15 min)
    const ipLimit = checkRateLimit(`edit-ip:${ip}`, 40, 15 * 60 * 1000);

    if (!targetLimit.allowed || !ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please wait before trying again." },
        { status: 429 }
      );
    }

    const parsed = editVerifySchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { slug, collectionSlug, snippetSlug, password } = parsed.data;

    const result = await verifySnippetEditPassword({
      slug,
      collectionSlug,
      snippetSlug,
      password,
    });

    const token = createEditToken({
      snippetId: result.snippetId,
      slug: result.slug,
      collectionSlug: result.collectionSlug,
      snippetSlug: result.snippetSlug,
      expiresInMs: 15 * 60 * 1000,
    });

    return NextResponse.json({
      success: true,
      token,
      snippet: {
        id: result.snippetId,
        slug: result.slug,
        collectionSlug: result.collectionSlug,
        snippetSlug: result.snippetSlug,
        title: result.title,
        content: result.content,
      },
    });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    const message = err instanceof Error ? err.message : "Failed to process edit request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  // Direct PUT support for saving changes with token
  return POST(req);
}
