import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import {
  getScheduledProjects,
  getProjectTypes,
  getHolidays,
  createProject,
} from "@/lib/capacity-db";
import { addBusinessDays, getBusinessDaysBetween, getAnimationEndDate } from "@/lib/capacity-scheduling";

export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get("month") ?? undefined;

    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Invalid month format. Expected YYYY-MM." },
        { status: 400 }
      );
    }

    const [projects, holidays] = await Promise.all([
      getScheduledProjects(month),
      getHolidays(),
    ]);

    const holidaySet = new Set(holidays.map((h) => h.date));
    const today = format(new Date(), "yyyy-MM-dd");

    const enriched = projects.map((p) => {
      const requiredDays = p.project_type?.default_duration_days ?? 0;
      const animationEnd = getAnimationEndDate(p, holidaySet);
      const totalBusinessDays = getBusinessDaysBetween(p.start_date, p.end_date, holidaySet);
      const businessDaysRemaining = p.end_date >= today
        ? getBusinessDaysBetween(today, p.end_date, holidaySet)
        : 0;
      const daysShort = requiredDays > totalBusinessDays
        ? requiredDays - totalBusinessDays
        : 0;

      // Determine animation phase
      const isAnimating = p.status !== "completed" && today >= p.start_date && today <= animationEnd;
      const isPostAnim = p.status !== "completed" && today > animationEnd && today <= p.end_date;
      const isQueued = p.status !== "completed" && today < p.start_date;

      return {
        ...p,
        animation_end_date: animationEnd,
        total_business_days: totalBusinessDays,
        business_days_remaining: businessDaysRemaining,
        days_short: p.status === "completed" ? 0 : daysShort,
        animation_phase: p.status === "completed"
          ? "completed"
          : isAnimating
          ? "in_animation"
          : isPostAnim
          ? "post_animation"
          : isQueued
          ? "queued"
          : "unknown",
      };
    });

    return NextResponse.json({ projects: enriched });
  } catch (error) {
    console.error("GET /api/capacity/projects error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_type_id,
      client_name,
      project_name,
      start_date,
      assigned_members,
      notes,
      created_by,
    } = body;

    if (!project_type_id || !client_name || !project_name || !start_date || !created_by) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: project_type_id, client_name, project_name, start_date, created_by.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      return NextResponse.json(
        { error: "Invalid start_date format. Expected YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const [projectTypes, holidays] = await Promise.all([
      getProjectTypes(),
      getHolidays(),
    ]);
    const projectType = projectTypes.find(
      (pt) => pt.id === project_type_id
    );

    if (!projectType) {
      return NextResponse.json(
        { error: `Project type with id ${project_type_id} not found.` },
        { status: 400 }
      );
    }

    const holidaySet = new Set(holidays.map((h) => h.date));
    const end_date = addBusinessDays(
      start_date,
      projectType.default_duration_days,
      holidaySet
    );

    const project = await createProject({
      project_type_id,
      client_name,
      project_name,
      start_date,
      end_date,
      assigned_members: assigned_members ?? [],
      notes: notes ?? "",
      created_by,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("POST /api/capacity/projects error:", error);
    return NextResponse.json(
      { error: "Failed to create project." },
      { status: 500 }
    );
  }
}
