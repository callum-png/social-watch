import { NextRequest, NextResponse } from "next/server";
import { getScheduledProjects } from "@/lib/capacity-db";
import { parseISO, eachDayOfInterval, isWeekend, format } from "date-fns";

// 4 pods × 2 campaigns each (different stages) = 8 max concurrent = 100%
const MAX_CONCURRENT = 8;

export async function GET(request: NextRequest) {
  try {
    const start = request.nextUrl.searchParams.get("start");
    const end = request.nextUrl.searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json(
        { error: "Missing required query parameters: start, end." },
        { status: 400 }
      );
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start) || !dateRegex.test(end)) {
      return NextResponse.json(
        { error: "Invalid date format. Expected YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (start > end) {
      return NextResponse.json(
        { error: "start must be before or equal to end." },
        { status: 400 }
      );
    }

    const projects = await getScheduledProjects();

    const days = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) })
      .filter((d) => !isWeekend(d))
      .map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const active = projects.filter(
          (p) =>
            p.start_date <= dateStr &&
            p.end_date >= dateStr &&
            p.status !== "completed" &&
            p.status !== "on_hold"
        );
        return {
          date: dateStr,
          utilization_percentage: Math.min(100, Math.round((active.length / MAX_CONCURRENT) * 100)),
          active_projects: active.map((p) => `${p.client_name} — ${p.project_name}`),
        };
      });

    return NextResponse.json({ days });
  } catch (error) {
    console.error("GET /api/capacity/schedule/capacity error:", error);
    return NextResponse.json({ error: "Failed to get capacity data." }, { status: 500 });
  }
}
