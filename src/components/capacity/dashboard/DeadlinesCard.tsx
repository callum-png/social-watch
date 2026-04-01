"use client";

import { useState, useEffect } from "react";
import { CalendarClock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/capacity/ui/card";
import { Badge } from "@/components/capacity/ui/badge";
import { formatDate, daysRemaining } from "@/lib/capacity-utils";

interface Project {
  id: number;
  project_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: string;
  days_short: number;
  business_days_remaining: number;
  total_business_days: number;
}

interface DeadlinesCardProps {
  month: string;
}

function getUrgencyVariant(days: number): "red" | "yellow" | "green" {
  if (days < 3) return "red";
  if (days < 7) return "yellow";
  return "green";
}

function getUrgencyLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `${days}d left`;
}

export function DeadlinesCard({ month }: DeadlinesCardProps) {
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
        const allProjects: Project[] = json.projects ?? json ?? [];
        const upcoming = allProjects
          .filter((p) => p.end_date && p.status !== "completed")
          .sort(
            (a, b) =>
              new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
          )
          .slice(0, 8);
        setProjects(upcoming);
        setLoading(false);
      })
      .catch(() => {
        setProjects([]);
        setLoading(false);
      });
  }, [month]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-gray-500" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-800" />
                  <div className="h-3 w-20 animate-pulse rounded bg-gray-800" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded bg-gray-800" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming deadlines</p>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => {
              const days = daysRemaining(project.end_date);
              const variant = getUrgencyVariant(days);

              return (
                <div
                  key={project.id}
                  className="flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-200">
                      {project.project_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{project.client_name} &middot; {formatDate(project.end_date)}</span>
                      {project.days_short > 0 && (
                        <span className="text-red-400 font-medium">
                          {project.days_short}d short
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={variant} className="ml-2 shrink-0">
                    {getUrgencyLabel(days)}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
