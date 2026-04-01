"use client";

import { useState, useEffect, useMemo } from "react";
import {
  parseISO,
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
  format,
  isWithinInterval,
  eachWeekOfInterval,
} from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/capacity/ui/card";
import { cn } from "@/lib/capacity-utils";

interface Project {
  id: number;
  project_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  animation_end_date?: string;
  animation_phase?: string;
  status: string;
  days_short?: number;
  project_type?: { id: number; name: string; color: string };
}

interface ProjectTimelineProps {
  month: string;
  onProjectClick: (id: number) => void;
}

const PHASE_COLORS: Record<string, { bar: string; bg: string }> = {
  in_animation: { bar: "bg-blue-500", bg: "bg-blue-500/20" },
  queued: { bar: "bg-yellow-500", bg: "bg-yellow-500/20" },
  post_animation: { bar: "bg-gray-600", bg: "bg-gray-600/20" },
  completed: { bar: "bg-emerald-600", bg: "bg-emerald-600/20" },
};

export function ProjectTimeline({
  month,
  onProjectClick,
}: ProjectTimelineProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/capacity/projects?month=${month}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((json) => {
        setProjects(json.projects ?? []);
        setLoading(false);
      })
      .catch(() => {
        setProjects([]);
        setLoading(false);
      });
  }, [month]);

  const monthStart = useMemo(
    () => startOfMonth(parseISO(`${month}-01`)),
    [month]
  );
  const monthEnd = useMemo(
    () => endOfMonth(parseISO(`${month}-01`)),
    [month]
  );
  const totalDays = differenceInCalendarDays(monthEnd, monthStart) + 1;

  const today = new Date();
  const todayInMonth = isWithinInterval(today, {
    start: monthStart,
    end: monthEnd,
  });
  const todayOffset = todayInMonth
    ? (differenceInCalendarDays(today, monthStart) / totalDays) * 100
    : null;

  const weekMarkers = useMemo(() => {
    const weeks = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 1 }
    );
    return weeks.map((w) => ({
      date: w,
      offset: Math.max(
        0,
        (differenceInCalendarDays(w, monthStart) / totalDays) * 100
      ),
      label: format(w, "MMM d"),
    }));
  }, [monthStart, monthEnd, totalDays]);

  const getBarPosition = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const clampedStart = start < monthStart ? monthStart : start;
    const clampedEnd = end > monthEnd ? monthEnd : end;
    const left =
      (differenceInCalendarDays(clampedStart, monthStart) / totalDays) * 100;
    const width =
      ((differenceInCalendarDays(clampedEnd, clampedStart) + 1) / totalDays) *
      100;
    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.max(1.5, width)}%`,
    };
  };

  // Sort: in_animation first, then queued, then post, then completed
  const phaseOrder: Record<string, number> = {
    in_animation: 0,
    queued: 1,
    post_animation: 2,
    completed: 3,
  };

  const sorted = useMemo(
    () =>
      [...projects]
        .filter((p) => p.status !== "completed")
        .sort((a, b) => {
          const pa = phaseOrder[a.animation_phase ?? ""] ?? 9;
          const pb = phaseOrder[b.animation_phase ?? ""] ?? 9;
          if (pa !== pb) return pa - pb;
          return a.start_date.localeCompare(b.start_date);
        }),
    [projects]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Project Timeline</CardTitle>
        <div className="flex items-center gap-4 mt-1">
          <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span className="h-2 w-4 rounded bg-blue-500 inline-block" />
            In Animation
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span className="h-2 w-4 rounded bg-yellow-500 inline-block" />
            Queued
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span className="h-2 w-4 rounded bg-gray-600 inline-block" />
            Post-Anim
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-28 animate-pulse rounded bg-gray-800" />
                <div className="h-7 w-full animate-pulse rounded bg-gray-800" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-gray-500">
            No projects scheduled this month
          </p>
        ) : (
          <div className="space-y-1">
            {/* Week markers header */}
            <div className="relative h-6 mb-2 border-b border-gray-800/50">
              {weekMarkers.map((w, i) => (
                <span
                  key={i}
                  className="absolute text-[10px] text-gray-600"
                  style={{ left: `${w.offset}%`, top: 0 }}
                >
                  {w.label}
                </span>
              ))}
              {todayOffset !== null && (
                <div
                  className="absolute top-0 h-full border-l border-red-500/50"
                  style={{ left: `${todayOffset}%` }}
                >
                  <span className="absolute -top-0.5 -translate-x-1/2 text-[9px] font-medium text-red-400">
                    Today
                  </span>
                </div>
              )}
            </div>

            {/* Project rows */}
            {sorted.map((project) => {
              const phase = project.animation_phase ?? "unknown";
              const colors = PHASE_COLORS[phase] ?? PHASE_COLORS.completed;

              // Animation window bar
              const animEnd =
                project.animation_end_date ?? project.end_date;
              const animPos = getBarPosition(
                project.start_date,
                animEnd
              );

              // Full project bar (to deadline) — only show if deadline > animation end
              const hasDeliveryTail =
                project.end_date > animEnd;
              const tailPos = hasDeliveryTail
                ? getBarPosition(animEnd, project.end_date)
                : null;

              return (
                <div key={project.id} className="relative h-9 group">
                  {/* Today line continuation */}
                  {todayOffset !== null && (
                    <div
                      className="absolute top-0 h-full border-l border-red-500/20"
                      style={{ left: `${todayOffset}%` }}
                    />
                  )}

                  {/* Delivery tail (faded) */}
                  {tailPos && (
                    <div
                      className="absolute top-1 h-7 rounded-r bg-gray-800/30 border border-gray-800/40 border-l-0"
                      style={{
                        left: tailPos.left,
                        width: tailPos.width,
                      }}
                    />
                  )}

                  {/* Animation window bar */}
                  <button
                    onClick={() => onProjectClick(project.id)}
                    className={cn(
                      "absolute top-1 h-7 flex items-center rounded px-2 transition-opacity hover:opacity-90 cursor-pointer border",
                      phase === "in_animation"
                        ? "bg-blue-600/20 border-blue-500/40"
                        : phase === "queued"
                        ? "bg-yellow-600/10 border-yellow-500/30"
                        : phase === "post_animation"
                        ? "bg-gray-700/20 border-gray-600/30"
                        : "bg-emerald-900/20 border-emerald-700/30"
                    )}
                    style={{
                      left: animPos.left,
                      width: animPos.width,
                    }}
                    title={`${project.client_name} — ${project.project_name}\nAnimation: ${project.start_date} → ${animEnd}\nDeadline: ${project.end_date}${project.days_short ? `\n⚠ ${project.days_short}d short` : ""}`}
                  >
                    <span className="truncate text-[11px] font-medium text-gray-200">
                      {project.client_name}
                    </span>
                    {(project.days_short ?? 0) > 0 && (
                      <span className="ml-1 text-[10px] text-red-400 font-medium shrink-0">
                        {project.days_short}d short
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
