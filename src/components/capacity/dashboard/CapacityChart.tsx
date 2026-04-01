"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  startOfMonth,
  endOfMonth,
  parseISO,
  format,
  eachDayOfInterval,
  isWeekend,
} from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/capacity/ui/card";

const MAX_LV = 2; // max concurrent launch videos
const MAX_LF = 1; // max long-form per week

interface CapacityDay {
  date: string;
  launch_videos_animating: number;
  launch_video_names: string[];
  long_form_animating: number;
  long_form_names: string[];
  in_animation: string[];
  active_projects: string[];
}

interface ChartDay {
  date: string;
  label: string;
  lvCount: number;
  lfCount: number;
  lvNames: string[];
  lfNames: string[];
  allAnimating: string[];
  allActive: string[];
}

interface CapacityChartProps {
  month: string;
}

function getBarColor(lvCount: number): string {
  if (lvCount > MAX_LV) return "#ef4444";
  if (lvCount === MAX_LV) return "#f59e0b";
  if (lvCount > 0) return "#3b82f6";
  return "#1e293b";
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDay }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 shadow-lg max-w-xs">
      <p className="text-sm font-medium text-gray-100">
        {format(parseISO(d.date), "EEE, MMM d")}
      </p>

      {/* Launch videos */}
      <div className="mt-1">
        <span className={
          d.lvCount > MAX_LV ? "text-red-400 font-medium text-sm" :
          d.lvCount === MAX_LV ? "text-yellow-400 text-sm" :
          "text-blue-400 text-sm"
        }>
          {d.lvCount} launch video{d.lvCount !== 1 ? "s" : ""}
        </span>
        <span className="text-gray-600 text-sm"> / {MAX_LV} max</span>
      </div>
      {d.lvNames.length > 0 && (
        <div className="mt-1">
          {d.lvNames.map((n, i) => (
            <p key={i} className="text-xs text-blue-300">{n}</p>
          ))}
        </div>
      )}

      {/* Long-form */}
      {d.lfCount > 0 && (
        <div className="mt-1.5 border-t border-gray-800 pt-1.5">
          <p className="text-xs text-purple-400">
            {d.lfCount} long-form video{d.lfCount !== 1 ? "s" : ""}
            <span className="text-gray-600"> (separate track)</span>
          </p>
          {d.lfNames.map((n, i) => (
            <p key={i} className="text-xs text-purple-300">{n}</p>
          ))}
        </div>
      )}

      {/* Post-animation projects */}
      {d.allActive.length > d.allAnimating.length && (
        <div className="mt-1 border-t border-gray-800 pt-1">
          <p className="text-[10px] text-gray-500">
            +{d.allActive.length - d.allAnimating.length} in post/delivery
          </p>
        </div>
      )}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex h-[240px] items-end gap-1 px-8">
      {Array.from({ length: 22 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 animate-pulse rounded-t bg-gray-800"
          style={{ height: `${10 + Math.random() * 40}%` }}
        />
      ))}
    </div>
  );
}

export function CapacityChart({ month }: CapacityChartProps) {
  const [data, setData] = useState<CapacityDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const date = parseISO(`${month}-01`);
    const start = format(startOfMonth(date), "yyyy-MM-dd");
    const end = format(endOfMonth(date), "yyyy-MM-dd");

    fetch(`/api/capacity/schedule/capacity?start=${start}&end=${end}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((json) => {
        setData(json.days ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [month]);

  const chartData: ChartDay[] = useMemo(() => {
    if (!data.length) {
      const date = parseISO(`${month}-01`);
      return eachDayOfInterval({
        start: startOfMonth(date),
        end: endOfMonth(date),
      })
        .filter((d) => !isWeekend(d))
        .map((d) => ({
          date: format(d, "yyyy-MM-dd"),
          label: format(d, "d"),
          lvCount: 0,
          lfCount: 0,
          lvNames: [],
          lfNames: [],
          allAnimating: [],
          allActive: [],
        }));
    }

    return data.map((d) => ({
      date: d.date,
      label: format(parseISO(d.date), "d"),
      lvCount: d.launch_videos_animating ?? 0,
      lfCount: d.long_form_animating ?? 0,
      lvNames: d.launch_video_names ?? [],
      lfNames: d.long_form_names ?? [],
      allAnimating: d.in_animation ?? [],
      allActive: d.active_projects ?? [],
    }));
  }, [data, month]);

  const stats = useMemo(() => {
    if (!chartData.length) return null;

    const today = format(new Date(), "yyyy-MM-dd");
    // Forward-looking stats: only count today and future
    const futureDays = chartData.filter((d) => d.date >= today);
    const pastDays = chartData.filter((d) => d.date < today);

    const todayData = chartData.find((d) => d.date === today);
    const todayLV = todayData?.lvCount ?? 0;
    const todayLF = todayData?.lfCount ?? 0;

    const futureOver = futureDays.filter((d) => d.lvCount > MAX_LV).length;
    const futureAtCap = futureDays.filter((d) => d.lvCount === MAX_LV).length;
    const futureOpen = futureDays.filter((d) => d.lvCount < MAX_LV).length;

    // When does it clear? Find first future open day
    const firstOpenDay = futureDays.find((d) => d.lvCount < MAX_LV);
    const clearsDate = firstOpenDay
      ? format(parseISO(firstOpenDay.date), "MMM d")
      : null;

    return {
      todayLV,
      todayLF,
      futureOver,
      futureAtCap,
      futureOpen,
      clearsDate,
      pastDays: pastDays.length,
    };
  }, [chartData]);

  const maxY = useMemo(() => {
    const maxCount = Math.max(...chartData.map((d) => d.lvCount), 0);
    return Math.max(maxCount + 1, MAX_LV + 2);
  }, [chartData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Launch Video Capacity
          <span className="ml-2 text-xs font-normal text-gray-500">
            max {MAX_LV} concurrent animations &middot; long-form tracked separately
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ChartSkeleton />
        ) : error ? (
          <div className="flex h-[240px] items-center justify-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
              >
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                />
                <YAxis
                  domain={[0, maxY]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  allowDecimals={false}
                  width={24}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <ReferenceLine
                  y={MAX_LV}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  label={{
                    value: `Max ${MAX_LV}`,
                    position: "right",
                    fill: "#ef4444",
                    fontSize: 10,
                  }}
                />
                <Bar dataKey="lvCount" radius={[3, 3, 0, 0]} name="Launch Videos">
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBarColor(entry.lvCount)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {stats && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>
                  Today:{" "}
                  <span className={
                    stats.todayLV > MAX_LV ? "font-medium text-red-400" :
                    stats.todayLV === MAX_LV ? "font-medium text-yellow-400" :
                    "font-medium text-emerald-400"
                  }>
                    {stats.todayLV} LV
                  </span>
                  {stats.todayLF > 0 && (
                    <span className="text-purple-400 ml-1">+{stats.todayLF} LF</span>
                  )}
                </span>
                {stats.futureOver > 0 && (
                  <>
                    <span className="text-gray-700">|</span>
                    <span className="text-red-400">
                      {stats.futureOver}d over cap ahead
                    </span>
                  </>
                )}
                {stats.futureOpen > 0 && (
                  <>
                    <span className="text-gray-700">|</span>
                    <span className="text-emerald-400">
                      {stats.futureOpen} open days ahead
                    </span>
                  </>
                )}
                {stats.clearsDate && stats.todayLV > MAX_LV && (
                  <>
                    <span className="text-gray-700">|</span>
                    <span>
                      Clears{" "}
                      <span className="font-medium text-gray-300">{stats.clearsDate}</span>
                    </span>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
