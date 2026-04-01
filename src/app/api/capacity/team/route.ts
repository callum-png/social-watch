import { NextResponse } from "next/server";
import { getTeamMembers } from "@/lib/capacity-db";

export async function GET() {
  try {
    const members = await getTeamMembers();
    return NextResponse.json({ members });
  } catch (error) {
    console.error("GET /api/capacity/team error:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members." },
      { status: 500 }
    );
  }
}
