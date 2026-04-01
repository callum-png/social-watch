import { NextRequest, NextResponse } from "next/server";
import { getSpyderBrands } from "@/lib/foreplay";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = parseInt(searchParams.get("limit") ?? "10", 10);

    const result = await getSpyderBrands(offset, limit);
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
