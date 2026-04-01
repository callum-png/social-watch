import { NextResponse } from "next/server";
import { db } from "@/db";
import { cronRuns } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const runs = await db
    .select()
    .from(cronRuns)
    .orderBy(desc(cronRuns.startedAt))
    .limit(50);

  return NextResponse.json({ runs });
}
