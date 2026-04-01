import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, watchedAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = parseInt(id);

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const accounts = await db
    .select()
    .from(watchedAccounts)
    .where(eq(watchedAccounts.userId, userId));

  return NextResponse.json({ user, watchedAccounts: accounts });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = parseInt(id);
  const body = await request.json();

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (body.status) {
    updateData.status = body.status;
    if (body.status === "approved") {
      updateData.approvedAt = new Date();
    }
  }
  if (body.adminNotes !== undefined) {
    updateData.adminNotes = body.adminNotes;
  }

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: updated });
}
