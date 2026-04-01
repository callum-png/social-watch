import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tweets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tweetDbId = parseInt(id);
  const body = await request.json();
  const { isHidden } = body;

  if (typeof isHidden !== "boolean") {
    return NextResponse.json(
      { error: "isHidden must be a boolean" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(tweets)
    .set({ isHidden })
    .where(eq(tweets.id, tweetDbId))
    .returning({ id: tweets.id, isHidden: tweets.isHidden });

  if (!updated) {
    return NextResponse.json({ error: "Tweet not found" }, { status: 404 });
  }

  return NextResponse.json({ tweet: updated });
}
