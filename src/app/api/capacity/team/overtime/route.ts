import { NextRequest, NextResponse } from "next/server";
import { getTeamMembers, getSnapshotsForMonth } from "@/lib/capacity-db";

function getWeeksInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const days = end.getDate() - start.getDate() + 1;
  return days / 7;
}

function getPreviousMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

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

    const prevMonth = getPreviousMonth(month);

    const [snapshots, members, prevSnapshots] = await Promise.all([
      getSnapshotsForMonth(month),
      getTeamMembers(),
      getSnapshotsForMonth(prevMonth),
    ]);

    const total_hours = snapshots.reduce(
      (sum, s) => sum + (s.total_overtime_hours ?? 0),
      0
    );

    const activeMembers = members.filter((m) => m.is_active);
    const weeksInMonth = getWeeksInMonth(month);
    const totalCapacityHours = activeMembers.reduce(
      (sum, m) => sum + m.weekly_capacity_hours * weeksInMonth,
      0
    );

    const percentage =
      totalCapacityHours > 0
        ? Math.round((total_hours / totalCapacityHours) * 10000) / 100
        : 0;

    const previous_month_hours = prevSnapshots.reduce(
      (sum, s) => sum + (s.total_overtime_hours ?? 0),
      0
    );

    const prevWeeksInMonth = getWeeksInMonth(prevMonth);
    const prevTotalCapacityHours = activeMembers.reduce(
      (sum, m) => sum + m.weekly_capacity_hours * prevWeeksInMonth,
      0
    );
    const previous_month_percentage =
      prevTotalCapacityHours > 0
        ? Math.round((previous_month_hours / prevTotalCapacityHours) * 10000) / 100
        : 0;

    return NextResponse.json({
      total_hours,
      percentage,
      previous_month_hours,
      previous_month_percentage,
    });
  } catch (error) {
    console.error("GET /api/capacity/team/overtime error:", error);
    return NextResponse.json(
      { error: "Failed to calculate overtime data." },
      { status: 500 }
    );
  }
}
