import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, watchedAccounts, notifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { normalizeHandle } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { twitterHandle, watchedAccountHandles } = body;

  if (!twitterHandle) {
    return NextResponse.json(
      { error: "Twitter handle is required" },
      { status: 400 }
    );
  }

  const handle = normalizeHandle(twitterHandle);

  // Check if user already exists
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.twitterHandle, handle))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      {
        error: "This handle is already registered",
        user: existing[0],
      },
      { status: 409 }
    );
  }

  // Create user
  const [newUser] = await db
    .insert(users)
    .values({
      twitterHandle: handle,
      status: "pending",
    })
    .returning();

  // Add watched accounts
  if (watchedAccountHandles?.length) {
    const accountValues = watchedAccountHandles.map((h: string) => ({
      userId: newUser.id,
      twitterHandle: normalizeHandle(h),
    }));
    await db.insert(watchedAccounts).values(accountValues);
  }

  // Create admin notification
  await db.insert(notifications).values({
    type: "new_user_request",
    title: `New user request from @${handle}`,
    message: `@${handle} wants to monitor ${watchedAccountHandles?.length ?? 0} accounts.`,
    referenceId: newUser.id,
  });

  return NextResponse.json(
    {
      id: newUser.id,
      twitterHandle: newUser.twitterHandle,
      status: newUser.status,
      message:
        "Your request has been submitted. You'll be notified when approved.",
    },
    { status: 201 }
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const handle = searchParams.get("handle");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  let query = db.select().from(users);

  if (status) {
    query = query.where(
      eq(users.status, status as "pending" | "approved" | "rejected" | "suspended")
    ) as typeof query;
  }
  if (handle) {
    query = query.where(eq(users.twitterHandle, normalizeHandle(handle))) as typeof query;
  }

  const results = await query
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return NextResponse.json({ users: results, page, limit });
}
