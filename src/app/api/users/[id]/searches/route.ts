import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { searchQueries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { parseRawQuery } from "@/lib/query-parser";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = parseInt(id);

  const queries = await db
    .select()
    .from(searchQueries)
    .where(eq(searchQueries.userId, userId));

  return NextResponse.json({ searches: queries });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = parseInt(id);
  const body = await request.json();

  const { label, rawQuery, category } = body;

  if (!label || !rawQuery) {
    return NextResponse.json(
      { error: "label and rawQuery are required" },
      { status: 400 }
    );
  }

  const parsed = parseRawQuery(rawQuery);

  const [newQuery] = await db
    .insert(searchQueries)
    .values({
      userId,
      category: category ?? "individual_user",
      label,
      rawQuery,
      apiQuery: parsed.apiQuery,
      minFavesThreshold: parsed.minFavesThreshold,
      hasDynamicDate: parsed.hasDynamicDate,
      isActive: true,
    })
    .returning();

  return NextResponse.json({ search: newQuery }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = parseInt(id);
  const { searchQueryId } = await request.json();

  const [deleted] = await db
    .delete(searchQueries)
    .where(
      and(
        eq(searchQueries.id, searchQueryId),
        eq(searchQueries.userId, userId)
      )
    )
    .returning();

  if (!deleted) {
    return NextResponse.json(
      { error: "Search query not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
