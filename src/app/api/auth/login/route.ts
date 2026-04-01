import { NextResponse } from "next/server";

// Legacy endpoint — auth now uses Supabase magic links via /api/auth/magic-link
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been replaced. Use magic link login." },
    { status: 410 }
  );
}
