import { NextRequest, NextResponse } from "next/server";
import { getFutureMessage } from "@/lib/data-service";

interface RouteParams {
  params: Promise<{
    slug: string;
  }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  try {
    const data = await getFutureMessage(slug);
    if (!data) {
      return NextResponse.json({ error: "FutureMe message not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching FutureMe message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
