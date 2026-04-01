"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/capacity/ui/card";
import { cn } from "@/lib/capacity-utils";

interface OvertimeData {
  total_hours: number;
  percentage: number;
  previous_month_hours: number;
  previous_month_percentage: number;
}

interface OvertimeCardProps {
  month: string;
}

export function OvertimeCard({ month }: OvertimeCardProps) {
  const [data, setData] = useState<OvertimeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/capacity/team/overtime?month=${month}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setData(null);
        setLoading(false);
      });
  }, [month]);

  const change = data
    ? data.percentage - data.previous_month_percentage
    : 0;
  const changeAbs = Math.abs(change).toFixed(1);
  const isUp = change > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Overtime</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <div className="h-10 w-28 animate-pulse rounded bg-gray-800" />
            <div className="h-5 w-40 animate-pulse rounded bg-gray-800" />
            <div className="h-5 w-36 animate-pulse rounded bg-gray-800" />
          </div>
        ) : data ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-100">
                {data.total_hours}h
              </span>
              <span className="text-sm text-gray-500">
                ({(data.percentage ?? 0).toFixed(1)}%)
              </span>
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              {isUp ? (
                <TrendingUp className="h-4 w-4 text-red-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-emerald-400" />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  isUp ? "text-red-400" : "text-emerald-400"
                )}
              >
                {isUp ? "\u2191" : "\u2193"} {changeAbs}%
              </span>
              <span className="text-sm text-gray-500">vs last month</span>
            </div>

            <p className="mt-1 text-xs text-gray-600">
              Previous: {data.previous_month_hours}h (
              {(data.previous_month_percentage ?? 0).toFixed(1)}%)
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-500">No overtime data available</p>
        )}
      </CardContent>
    </Card>
  );
}
