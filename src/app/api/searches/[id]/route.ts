import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { searchQueries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseRawQuery } from "@/lib/query-parser";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const queryId = parseInt(id);
  const body = await request.json();

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (body.isActive !== undefined) {
    updateData.isActive = body.isActive;
  }
  if (body.label) {
    updateData.label = body.label;
  }
  if (body.rawQuery) {
    const parsed = parseRawQuery(body.rawQuery);
    updateData.rawQuery = body.rawQuery;
    updateData.apiQuery = parsed.apiQuery;
    updateData.minFavesThreshold = parsed.minFavesThreshold;
    updateData.hasDynamicDate = parsed.hasDynamicDate;
  }

  const [updated] = await db
    .update(searchQueries)
    .set(updateData)
    .where(eq(searchQueries.id, queryId))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Search query not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ search: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const queryId = parseInt(id);

  const [deleted] = await db
    .delete(searchQueries)
    .where(eq(searchQueries.id, queryId))
    .returning();

  if (!deleted) {
    return NextResponse.json(
      { error: "Search query not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
