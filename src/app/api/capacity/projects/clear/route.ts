import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

function getSql() {
  const url = process.env.CAPACITY_DATABASE_URL;
  if (!url) throw new Error("CAPACITY_DATABASE_URL is not set");
  return neon(url);
}

export async function DELETE() {
  try {
    const sql = getSql();
    await sql`TRUNCATE TABLE scheduled_projects RESTART IDENTITY`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/capacity/projects/clear error:", error);
    return NextResponse.json({ error: "Failed to clear projects." }, { status: 500 });
  }
}
