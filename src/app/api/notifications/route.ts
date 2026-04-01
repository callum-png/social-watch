import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  const conditions = [];
  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }

  const results = await db
    .select()
    .from(notifications)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  // Get unread count
  const unreadResults = await db
    .select()
    .from(notifications)
    .where(eq(notifications.isRead, false));

  return NextResponse.json({
    notifications: results,
    unreadCount: unreadResults.length,
  });
}

export async function PATCH(request: NextRequest) {
  const { ids } = await request.json();

  if (!ids?.length) {
    return NextResponse.json(
      { error: "ids array is required" },
      { status: 400 }
    );
  }

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(inArray(notifications.id, ids));

  return NextResponse.json({ success: true });
}
