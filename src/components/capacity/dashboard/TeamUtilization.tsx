"use client";

import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import {
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  isWithinInterval,
} from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/capacity/ui/card";
import { cn } from "@/lib/capacity-utils";

interface TeamMember {
  id: number;
  name: string;
  role: string;
  weekly_capacity_hours: number;
  utilization: number;
}

interface Project {
  id: number;
  start_date: string;
  end_date: string;
  assigned_members: number[];
}

interface TeamUtilizationProps {
  month: string;
}

function getBarColor(utilization: number): string {
  if (utilization > 85) return "bg-red-500";
  if (utilization >= 70) return "bg-yellow-500";
  return "bg-emerald-500";
}

function getTextColor(utilization: number): string {
  if (utilization > 85) return "text-red-400";
  if (utilization >= 70) return "text-yellow-400";
  return "text-emerald-400";
}

function countBusinessDays(start: Date, end: Date): number {
  return eachDayOfInterval({ start, end }).filter((d) => !isWeekend(d)).length;
}

export function TeamUtilization({ month }: TeamUtilizationProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      fetch(`/api/capacity/team`).then((r) => r.ok ? r.json() : Promise.reject()),
      fetch(`/api/capacity/projects?month=${month}`).then((r) => r.ok ? r.json() : Promise.reject()),
    ])
      .then(([teamData, projectsData]) => {
        const teamMembers: Omit<TeamMember, "utilization">[] = teamData.members ?? [];
        const projects: Project[] = projectsData.projects ?? [];

        const monthStart = startOfMonth(parseISO(`${month}-01`));
        const monthEnd = endOfMonth(parseISO(`${month}-01`));
        const totalBusinessDays = countBusinessDays(monthStart, monthEnd);
        const hoursPerDay = 8;
        const totalAvailableHours = totalBusinessDays * hoursPerDay;

        const merged: TeamMember[] = teamMembers.map((m) => {
          const assignedDays = projects
            .filter((p) => (p.assigned_members ?? []).includes(m.id))
            .reduce((sum, p) => {
              const pStart = parseISO(p.start_date);
              const pEnd = parseISO(p.end_date);
              const clampedStart = pStart < monthStart ? monthStart : pStart;
              const clampedEnd = pEnd > monthEnd ? monthEnd : pEnd;
              if (clampedStart > clampedEnd) return sum;
              return sum + countBusinessDays(clampedStart, clampedEnd);
            }, 0);

          const usedHours = assignedDays * hoursPerDay;
          const utilization =
            totalAvailableHours > 0
              ? Math.round((usedHours / totalAvailableHours) * 100)
              : 0;

          return { ...m, utilization };
        });

        merged.sort((a, b) => b.utilization - a.utilization);
        setMembers(merged);
        setLoading(false);
      })
      .catch(() => {
        setMembers([]);
        setLoading(false);
      });
  }, [month]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-gray-500" />
          Team Utilization
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-4 w-28 animate-pulse rounded bg-gray-800" />
                  <div className="h-4 w-10 animate-pulse rounded bg-gray-800" />
                </div>
                <div className="h-2 w-full animate-pulse rounded-full bg-gray-800" />
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-gray-500">No team data available</p>
        ) : (
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-200">
                      {member.name}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      {member.role}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      getTextColor(member.utilization)
                    )}
                  >
                    {member.utilization}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-800">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all duration-500",
                      getBarColor(member.utilization)
                    )}
                    style={{
                      width: `${Math.min(100, member.utilization)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
