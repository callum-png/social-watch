import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/capacity-db";
import { neon } from "@neondatabase/serverless";

function getSql() {
  const url = process.env.CAPACITY_DATABASE_URL;
  if (!url) throw new Error("CAPACITY_DATABASE_URL not set");
  return neon(url);
}

export async function GET() {
  try {
    await initializeDatabase();
    const sql = getSql();
    const rows = await sql`SELECT role_key, max_slots FROM capacity_settings`;
    const settings: Record<string, number> = {};
    for (const row of rows) settings[row.role_key as string] = row.max_slots as number;
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await initializeDatabase();
    const sql = getSql();
    const body = await req.json() as Record<string, number>;
    for (const [role_key, max_slots] of Object.entries(body)) {
      const slots = Math.max(1, Math.round(Number(max_slots)));
      await sql`
        INSERT INTO capacity_settings (role_key, max_slots) VALUES (${role_key}, ${slots})
        ON CONFLICT (role_key) DO UPDATE SET max_slots = ${slots}
      `;
    }
    const rows = await sql`SELECT role_key, max_slots FROM capacity_settings`;
    const settings: Record<string, number> = {};
    for (const row of rows) settings[row.role_key as string] = row.max_slots as number;
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
