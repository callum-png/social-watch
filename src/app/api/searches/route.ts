import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { searchQueries } from "@/db/schema";
import { eq, isNull, and, desc } from "drizzle-orm";
import { parseRawQuery } from "@/lib/query-parser";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const active = searchParams.get("active");

  const conditions = [isNull(searchQueries.userId)];

  if (category) {
    conditions.push(
      eq(
        searchQueries.category,
        category as "launch_videos" | "memes" | "individual_user"
      )
    );
  }
  if (active === "true") {
    conditions.push(eq(searchQueries.isActive, true));
  }

  const queries = await db
    .select()
    .from(searchQueries)
    .where(and(...conditions))
    .orderBy(desc(searchQueries.createdAt));

  return NextResponse.json({ searches: queries });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { label, rawQuery, category } = body;

  if (!label || !rawQuery || !category) {
    return NextResponse.json(
      { error: "label, rawQuery, and category are required" },
      { status: 400 }
    );
  }

  const parsed = parseRawQuery(rawQuery);

  const [newQuery] = await db
    .insert(searchQueries)
    .values({
      userId: null,
      category,
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
