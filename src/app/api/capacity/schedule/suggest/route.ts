import { NextRequest, NextResponse } from "next/server";
import { suggestLaunchDates } from "@/lib/capacity-scheduling";

export async function GET(request: NextRequest) {
  try {
    const projectTypeId = request.nextUrl.searchParams.get("projectTypeId") ?? request.nextUrl.searchParams.get("project_type_id");

    if (!projectTypeId) {
      return NextResponse.json(
        { error: "Missing required query parameter: projectTypeId." },
        { status: 400 }
      );
    }

    const parsedId = Number(projectTypeId);
    if (isNaN(parsedId)) {
      return NextResponse.json(
        { error: "projectTypeId must be a valid number." },
        { status: 400 }
      );
    }

    const slots = await suggestLaunchDates(parsedId);

    return NextResponse.json({ slots });
  } catch (error) {
    console.error("GET /api/capacity/schedule/suggest error:", error);
    return NextResponse.json(
      { error: "Failed to suggest launch dates." },
      { status: 500 }
    );
  }
}
