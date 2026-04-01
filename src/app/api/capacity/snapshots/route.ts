import { NextRequest, NextResponse } from "next/server";
import { getSnapshotsForMonth, upsertSnapshot } from "@/lib/capacity-db";

export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get("month");

    if (!month) {
      return NextResponse.json(
        { error: "Missing required query parameter: month." },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Invalid month format. Expected YYYY-MM." },
        { status: 400 }
      );
    }

    const snapshots = await getSnapshotsForMonth(month);
    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error("GET /api/capacity/snapshots error:", error);
    return NextResponse.json(
      { error: "Failed to fetch snapshots." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, team_sentiment_score, total_overtime_hours, notes } = body;

    if (!date) {
      return NextResponse.json(
        { error: "Missing required field: date." },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Expected YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (
      team_sentiment_score !== undefined &&
      (typeof team_sentiment_score !== "number" ||
        team_sentiment_score < 0 ||
        team_sentiment_score > 10)
    ) {
      return NextResponse.json(
        { error: "team_sentiment_score must be a number between 0 and 10." },
        { status: 400 }
      );
    }

    if (
      total_overtime_hours !== undefined &&
      (typeof total_overtime_hours !== "number" || total_overtime_hours < 0)
    ) {
      return NextResponse.json(
        { error: "total_overtime_hours must be a non-negative number." },
        { status: 400 }
      );
    }

    const snapshot = await upsertSnapshot({
      date,
      team_sentiment_score: team_sentiment_score ?? 3.5,
      total_overtime_hours: total_overtime_hours ?? 0,
      notes: notes ?? "",
    });

    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (error) {
    console.error("POST /api/capacity/snapshots error:", error);
    return NextResponse.json(
      { error: "Failed to upsert snapshot." },
      { status: 500 }
    );
  }
}
