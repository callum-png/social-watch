'use client';

import { useState, useMemo, useRef, useEffect, useCallback, Fragment } from 'react';
import { PTPost, extractMetrics, formatNumber, ALL_CHECKPOINTS, minutesToLabel, CheckpointData } from '@/lib/post-tracker-api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';

interface TrajectoryChartProps {
  posts: PTPost[];
  metric: 'views' | 'likes' | 'retweets' | 'replies';
  historicalAverage?: CheckpointData[];
  readOnly?: boolean;
  isolatedIds?: Set<string> | null;
  onToggleIsolate?: (postId: string) => void;
}

const COLORS = [
  '#3b82f6', '#f97316', '#ec4899', '#10b981', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f59e0b', '#14b8a6', '#6366f1',
  '#f43f5e', '#84cc16',
];

const READABLE_LABELS: Record<number, string> = {
  15: '15m', 30: '30m', 45: '45m', 60: '1h', 120: '2h', 180: '3h',
  240: '4h', 360: '6h', 480: '8h', 720: '12h', 1080: '18h', 1440: '1d',
  1800: '30h', 2160: '1.5d', 2520: '42h', 2880: '2d',
};

const AXIS_TICK_MINUTES = [15, 30, 60, 120, 240, 360, 720, 1440, 2160, 2880];

/** Project engagement metric (likes/retweets/replies) using logarithmic scaling.
 *  Engagement accrues fast early then tapers — log(t) captures this naturally. */
export function projectEngagementLog(
  dataPoints: { minutes: number; value: number }[],
  futureMinutes: number[],
): { minutes: number; value: number }[] {
  if (dataPoints.length < 1) return [];
  const last = dataPoints[dataPoints.length - 1];
  if (last.minutes <= 1 || last.value <= 0) return [];

  return futureMinutes.map(m => ({
    minutes: m,
    value: Math.round(last.value * Math.log(m) / Math.log(last.minutes)),
  }));
}

/**
 * Project views using log-log (power law) regression: v = a * t^b
 * Fits ln(v) = ln(a) + b*ln(t) across all data points, then clamps
 * the growth exponent to [0.05, 0.95] to avoid runaway projections.
 * Always anchors the projection at or above the last real value.
 */
export function projectTrend(
  dataPoints: { minutes: number; value: number }[],
  futureMinutes: number[],
): { minutes: number; value: number }[] {
  const valid = dataPoints.filter(p => p.minutes > 0 && p.value > 0);
  if (valid.length < 2) return projectEngagementLog(valid, futureMinutes);

  const logPts = valid.map(p => ({ x: Math.log(p.minutes), y: Math.log(p.value) }));
  const n = logPts.length;
  const sumX = logPts.reduce((s, p) => s + p.x, 0);
  const sumY = logPts.reduce((s, p) => s + p.y, 0);
  const sumXY = logPts.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = logPts.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return projectEngagementLog(valid, futureMinutes);

  const b = Math.max(0.05, Math.min((n * sumXY - sumX * sumY) / denom, 0.95));
  const last = valid[valid.length - 1];

  // Anchor through last real point: value = last.value * (m / last.minutes)^b
  // This guarantees the curve passes through the last data point with no flat start.
  return futureMinutes.map(m => ({
    minutes: m,
    value: Math.round(last.value * Math.pow(m / last.minutes, b)),
  }));
}

/** Returns ~8 log-spaced minute values between lastMin and 2880, plus key milestones.
 *  Keeps projection lines visually smooth — far fewer points than all 50 checkpoints. */
function sparseProjectionMinutes(lastMin: number): number[] {
  const MAX = 2880;
  if (lastMin >= MAX) return [];
  const logStart = Math.log(lastMin);
  const logEnd = Math.log(MAX);
  const points = new Set<number>();
  for (let i = 1; i <= 8; i++) {
    const m = Math.round(Math.exp(logStart + (logEnd - logStart) * (i / 8)));
    if (m > lastMin && m <= MAX) points.add(m);
  }
  [720, 1440, 2880].forEach(m => { if (m > lastMin) points.add(m); });
  return Array.from(points).sort((a, b) => a - b);
}

const TOOLTIP_COLLAPSE_LIMIT = 8;

function ChartTooltip({ active, payload, label, postLookup, highlightedId, projectedKeys, expanded, onToggleExpand }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const timeLabel = READABLE_LABELS[label as number] || minutesToLabel(label as number);

  let entries = [...payload].filter((e: any) => e.value != null && e.dataKey !== '_average' && !(projectedKeys as Set<string>)?.has(e.dataKey));

  // Include projected entries separately
  const projEntries = [...payload].filter((e: any) => e.value != null && (projectedKeys as Set<string>)?.has(e.dataKey));

  // Average entry
  const avgEntry = [...payload].find((e: any) => e.value != null && e.dataKey === '_average');

  if (highlightedId) {
    const focused = entries.find((e: any) => e.dataKey === highlightedId);
    const focusedProj = projEntries.find((e: any) => e.dataKey === `${highlightedId}_proj`);
    entries = focused ? [focused] : [];
    if (focusedProj) entries.push(focusedProj);
  } else {
    entries.sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
  }

  if (entries.length === 0 && projEntries.length === 0 && !avgEntry) return null;
  const allEntries = highlightedId ? entries : [...entries, ...projEntries];
  if (avgEntry) allEntries.push(avgEntry);

  const needsTruncation = !highlightedId && allEntries.length > TOOLTIP_COLLAPSE_LIMIT;
  const visibleEntries = needsTruncation && !expanded
    ? allEntries.slice(0, TOOLTIP_COLLAPSE_LIMIT)
    : allEntries;
  const hiddenCount = allEntries.length - TOOLTIP_COLLAPSE_LIMIT;

  return (
    <div className="bg-[#0a0b0c] border border-[#2a2d32] rounded-xl px-3 py-2 shadow-2xl shadow-black/80 min-w-[160px] max-w-[220px]">
      <p className="text-white text-[11px] font-semibold mb-1.5 pb-1 border-b border-[#2a2d32]">{timeLabel}</p>
      <div className="space-y-0.5">
        {visibleEntries.map((entry: any, i: number) => {
          const isAvg = entry.dataKey === '_average';
          const isProjected = !isAvg && (projectedKeys as Set<string>)?.has(entry.dataKey);
          const realKey = isProjected ? entry.dataKey.replace('_proj', '') : entry.dataKey;
          const info = isAvg ? null : postLookup[realKey];
          const color = isAvg ? '#5c6370' : (info?.color || '#5c6370');
          return (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color, opacity: isProjected ? 0.5 : 1 }} />
                <span className="text-[10px] truncate" style={{ color }}>
                  {info ? `@${info.handle}` : 'Projected'}{isProjected ? ' (proj)' : ''}
                </span>
              </div>
              <span className={`text-[10px] font-bold tabular-nums shrink-0 ${isProjected ? 'text-[#5c6370]' : 'text-white'}`}>
                {(entry.value as number).toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
      {needsTruncation && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
          className="w-full mt-1 pt-1 border-t border-[#2a2d32] text-[9px] text-[#5c6370] hover:text-white transition-colors text-center"
        >
          {expanded ? 'Show less' : `+${hiddenCount} more`}
        </button>
      )}
    </div>
  );
}

export default function TrajectoryChart({ posts, metric, historicalAverage, readOnly, isolatedIds, onToggleIsolate }: TrajectoryChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [tooltipExpanded, setTooltipExpanded] = useState(false);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [xDomain, setXDomain] = useState<[number, number] | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current); };
  }, []);

  const hasIsolation = isolatedIds != null && isolatedIds.size > 0;

  const postLookup = useMemo(() => {
    const map: Record<string, { handle: string; color: string; profileUrl: string; isShown: boolean }> = {};
    posts.forEach((post, i) => {
      map[post['Post ID']] = {
        handle: post['Account Handle'],
        color: COLORS[i % COLORS.length],
        profileUrl: `https://unavatar.io/twitter/${post['Account Handle']}`,
        isShown: post['Shown'] === 'true',
      };
    });
    return map;
  }, [posts]);

  // Build chart data with all checkpoints + projections for isolated tracking posts
  const { chartData: filteredData, projectedPostIds } = useMemo(() => {
    const allData = ALL_CHECKPOINTS.map(({ name, minutes }) => {
      const point: Record<string, number | string> = { minutes };
      posts.forEach((post) => {
        const metrics = extractMetrics(post);
        const match = metrics.find(m => m.checkpoint === name);
        if (match) point[post['Post ID']] = match[metric];
      });
      return point;
    });

    // Filter to points that have at least one post's data
    const filtered = allData.filter(point => {
      const keys = Object.keys(point).filter(k => k !== 'minutes');
      return keys.some(k => point[k] !== undefined);
    });

    // Compute projections for isolated posts (tracking or completed with partial data)
    const projIds = new Set<string>();
    if (hasIsolation) {
      posts.forEach((post) => {
        const id = post['Post ID'];
        if (!isolatedIds!.has(id)) return;

        const metrics = extractMetrics(post);
        const withData = metrics.filter(m => m.hasData);
        if (withData.length < 2) return;

        const dataPoints = withData.map(m => ({ minutes: m.minutes, value: m[metric] as number }));
        const lastMinutes = dataPoints[dataPoints.length - 1].minutes;

        // Get sparse log-spaced future minutes for a smooth projection arc
        const futureMinutes = sparseProjectionMinutes(lastMinutes);

        if (futureMinutes.length === 0) return;

        const projected = metric === 'views'
          ? projectTrend(dataPoints, futureMinutes)
          : projectEngagementLog(dataPoints, futureMinutes);
        if (projected.length === 0) return;

        projIds.add(id);
        const projKey = `${id}_proj`;

        // Add the bridge point (last real value) so the dashed line connects
        const bridgeIdx = filtered.findIndex(p => (p.minutes as number) === lastMinutes);
        if (bridgeIdx >= 0) {
          filtered[bridgeIdx][projKey] = filtered[bridgeIdx][id];
        }

        // Add projected values into existing data points or create new ones
        projected.forEach(({ minutes, value }) => {
          let existing = filtered.find(p => (p.minutes as number) === minutes);
          if (!existing) {
            existing = { minutes };
            filtered.push(existing);
          }
          existing[projKey] = value;
        });
      });

      // Re-sort by minutes if we added new points
      if (projIds.size > 0) {
        filtered.sort((a, b) => (a.minutes as number) - (b.minutes as number));
      }
    }

    // Merge historical average into chart data
    if (historicalAverage && historicalAverage.length > 0) {
      historicalAverage.forEach(avg => {
        let existing = filtered.find(p => (p.minutes as number) === avg.minutes);
        if (!existing) {
          existing = { minutes: avg.minutes };
          filtered.push(existing);
        }
        existing['_average'] = avg[metric];
      });
      filtered.sort((a, b) => (a.minutes as number) - (b.minutes as number));
    }

    return { chartData: filtered, projectedPostIds: projIds };
  }, [posts, metric, hasIsolation, isolatedIds, historicalAverage]);

  const projectedKeys = useMemo(() => {
    return new Set(Array.from(projectedPostIds).map(id => `${id}_proj`));
  }, [projectedPostIds]);

  const yMin = useMemo(() => {
    // Only use 500K floor for views when showing many posts (trajectory page)
    // For single/few posts (war room, benchmark), use dynamic floor
    if (metric === 'views' && posts.length > 3) return 500000;
    let minVal = Infinity;
    filteredData.forEach(point => {
      Object.entries(point).forEach(([key, val]) => {
        if (key !== 'minutes' && !key.endsWith('_proj') && typeof val === 'number' && val > 0 && val < minVal) minVal = val;
      });
    });
    if (minVal === Infinity) return 0;
    const floor = Math.floor(minVal * 0.8);
    if (floor >= 1000000) return Math.floor(floor / 500000) * 500000;
    if (floor >= 1000) return Math.floor(floor / 500) * 500;
    return 0;
  }, [filteredData, metric]);

  const visibleTicks = useMemo(() => {
    if (!xDomain) return AXIS_TICK_MINUTES;
    const [lo, hi] = xDomain;
    const range = hi - lo;
    const allMinutes = ALL_CHECKPOINTS.map(cp => cp.minutes).filter(m => m >= lo && m <= hi);
    if (range <= 120) return allMinutes;
    if (range <= 360) return allMinutes.filter(m => m % 30 === 0);
    if (range <= 720) return allMinutes.filter(m => m % 60 === 0);
    return AXIS_TICK_MINUTES.filter(m => m >= lo && m <= hi);
  }, [xDomain]);

  const postSummaries = useMemo(() => {
    return posts.map((post, index) => {
      const metrics = extractMetrics(post);
      const latest = metrics[metrics.length - 1];
      return {
        post,
        color: COLORS[index % COLORS.length],
        profileUrl: `https://unavatar.io/twitter/${post['Account Handle']}`,
        latestValue: latest ? latest[metric] as number : 0,
        label: latest ? latest.displayLabel : '—',
        isTracking: post['Status'] === 'tracking',
      };
    }).sort((a, b) => b.latestValue - a.latestValue);
  }, [posts, metric]);

  function handleSidebarEnter(postId: string) {
    setHoveredId(postId);
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => setShowPreview(postId), 400);
  }

  function handleSidebarLeave() {
    setHoveredId(null);
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    setShowPreview(null);
  }

  const handleMouseDown = useCallback((e: any) => {
    if (e?.activeLabel != null) {
      setRefAreaLeft(e.activeLabel);
      setIsDragging(true);
    }
  }, []);

  const handleMouseMove = useCallback((e: any) => {
    if (isDragging && e?.activeLabel != null) {
      setRefAreaRight(e.activeLabel);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (refAreaLeft != null && refAreaRight != null && refAreaLeft !== refAreaRight) {
      const left = Math.min(refAreaLeft, refAreaRight);
      const right = Math.max(refAreaLeft, refAreaRight);
      setXDomain([left, right]);
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsDragging(false);
  }, [refAreaLeft, refAreaRight]);

  const resetZoom = useCallback(() => {
    setXDomain(null);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, []);

  if (filteredData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-black/30 rounded-xl border border-[#2a2d32]">
        <p className="text-[#5c6370] text-xs">No data available yet</p>
      </div>
    );
  }

  const xDomainProp: [number | string, number | string] = useMemo(() => {
    if (xDomain) return [xDomain[0], xDomain[1]];
    if (filteredData.length <= 1) {
      return [0, AXIS_TICK_MINUTES[AXIS_TICK_MINUTES.length - 1]];
    }
    return ['dataMin', 'dataMax'];
  }, [xDomain, filteredData]);

  function getLineStyle(postId: string, color: string) {
    const isHovered = hoveredId === postId;
    const isIsolated = hasIsolation && isolatedIds!.has(postId);
    const somethingHovered = hoveredId !== null;
    const fadedByHover = somethingHovered && !isHovered;
    const fadedByIsolation = hasIsolation && !isIsolated;
    const isShown = postLookup[postId]?.isShown ?? false;

    if (isHovered) {
      return { strokeWidth: 3, strokeOpacity: 1, dot: { r: 3, fill: color, stroke: '#111214', strokeWidth: 2 } as any, activeDot: { r: 5, fill: color, stroke: '#fff', strokeWidth: 2 } as any };
    }
    if (fadedByHover) {
      return { strokeWidth: 1.5, strokeOpacity: 0.08, dot: false as const, activeDot: false as const };
    }
    if (isIsolated) {
      return { strokeWidth: 2.5, strokeOpacity: 1, dot: false as const, activeDot: { r: 4, fill: color, stroke: '#111214', strokeWidth: 1.5 } as any };
    }
    if (fadedByIsolation) {
      return { strokeWidth: 1, strokeOpacity: 0.1, dot: false as const, activeDot: false as const };
    }
    // Default state: Shown posts get slightly thicker lines and higher opacity
    const baseWidth = isShown ? 2.5 : 2;
    const baseOpacity = isShown ? 0.85 : 0.7;
    return { strokeWidth: baseWidth, strokeOpacity: baseOpacity, dot: false as const, activeDot: { r: 3, fill: color, stroke: '#111214', strokeWidth: 1.5 } as any };
  }

  return (
    <div className="flex gap-3">
      <div className="flex-1 min-w-0 relative" style={{ zIndex: 1 }}>
        <div className="h-[240px] md:h-[340px]" style={{ overflow: 'visible' }}>
        {xDomain && (
          <div className="flex justify-end mb-1">
            <button
              onClick={resetZoom}
              className="px-2 py-0.5 text-[10px] font-medium rounded border border-[#2a2d32] text-[#8b9199] hover:text-white hover:border-[#5c6370] transition-all bg-black/30"
            >
              Reset Zoom
            </button>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredData}
            margin={{ top: 5, right: 15, left: 5, bottom: 0 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1c20" vertical={false} />
            <XAxis
              dataKey="minutes"
              type="number"
              domain={xDomainProp}
              ticks={visibleTicks}
              tickFormatter={(v) => READABLE_LABELS[v] || minutesToLabel(v)}
              tick={{ fontSize: 10, fill: '#5c6370' }}
              stroke="#2a2d32"
              tickLine={false}
              axisLine={{ stroke: '#2a2d32' }}
              padding={{ left: 5, right: 5 }}
              allowDataOverflow={!!xDomain}
            />
            <YAxis
              domain={[yMin, 'auto']}
              tick={{ fontSize: 10, fill: '#5c6370' }}
              stroke="#2a2d32"
              tickLine={false}
              axisLine={false}
              width={45}
              tickFormatter={(v) => {
                if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                return v;
              }}
            />
            <Tooltip
              content={<ChartTooltip postLookup={postLookup} highlightedId={hoveredId} projectedKeys={projectedKeys} expanded={tooltipExpanded} onToggleExpand={() => setTooltipExpanded(v => !v)} />}
              cursor={{ stroke: '#2a2d32', strokeDasharray: '4 4' }}
              wrapperStyle={{ zIndex: 50 }}
            />
            {/* Real data lines */}
            {posts.map((post, index) => {
              const color = COLORS[index % COLORS.length];
              const id = post['Post ID'];
              const style = getLineStyle(id, color);
              return (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  name={`@${post['Account Handle']}`}
                  stroke={color}
                  strokeWidth={style.strokeWidth}
                  strokeOpacity={style.strokeOpacity}
                  dot={style.dot}
                  activeDot={style.activeDot}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              );
            })}
            {/* Projected median reference line */}
            {historicalAverage && historicalAverage.length > 0 && (
              <Line
                key="_average"
                type="monotone"
                dataKey="_average"
                name="Projected (Median)"
                stroke="#5c6370"
                strokeWidth={1.5}
                strokeOpacity={0.4}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 3, fill: '#5c6370', stroke: '#111214', strokeWidth: 1 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            {/* Projected trend lines (dashed) */}
            {Array.from(projectedPostIds).map(id => {
              const info = postLookup[id];
              if (!info) return null;
              return (
                <Line
                  key={`${id}_proj`}
                  type="monotone"
                  dataKey={`${id}_proj`}
                  name={`@${info.handle} (projected)`}
                  stroke={info.color}
                  strokeWidth={1.5}
                  strokeOpacity={0.4}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 3, fill: info.color, stroke: '#111214', strokeWidth: 1, fillOpacity: 0.5 }}
                  connectNulls={true}
                  isAnimationActive={false}
                />
              );
            })}
            {refAreaLeft != null && refAreaRight != null && (
              <ReferenceArea
                x1={refAreaLeft}
                x2={refAreaRight}
                strokeOpacity={0.3}
                fill="#1d9bf0"
                fillOpacity={0.15}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        </div>
        {!xDomain && (
          <p className="text-[9px] text-[#3a3d42] text-center mt-0.5 select-none">drag to zoom</p>
        )}
      </div>

      {/* Sidebar legend */}
      {!readOnly && (
        <div className="hidden md:block w-[170px] shrink-0 max-h-[360px] overflow-y-auto pt-1">
          <div className="space-y-px">
            {postSummaries.map((item) => {
              const id = item.post['Post ID'];
              const isHovered = hoveredId === id;
              const isIsolated = hasIsolation && isolatedIds!.has(id);
              const hasProjection = projectedPostIds.has(id);
              const isShown = item.post['Shown'] === 'true';
              return (
                <div key={id} className="relative">
                  <button
                    onMouseEnter={() => handleSidebarEnter(id)}
                    onMouseLeave={handleSidebarLeave}
                    onClick={() => onToggleIsolate?.(id)}
                    className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded-md transition-all text-left ${
                      isIsolated ? 'bg-white/5' : isHovered ? 'bg-black/40' : 'hover:bg-black/20'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: item.color,
                        opacity: hasIsolation && !isIsolated ? 0.2 : 1,
                        boxShadow: isShown ? '0 0 8px rgba(29,155,240,0.3)' : undefined,
                      }}
                    />
                    <span className={`text-[10px] font-medium truncate flex-1 transition-colors ${
                      isIsolated ? 'text-white' : isHovered ? 'text-white' : hasIsolation ? 'text-[#3a3d42]' : 'text-[#8b9199]'
                    }`}>
                      {isShown && <span className="inline-flex items-center justify-center w-[12px] h-[12px] text-[7px] font-bold bg-[#1d9bf0] text-white rounded mr-0.5 align-middle leading-none">S</span>}
                      @{item.post['Account Handle']}
                    </span>
                    <span className={`text-[9px] tabular-nums shrink-0 font-medium ${
                      isIsolated ? 'text-[#8b9199]' : hasIsolation ? 'text-[#2a2d32]' : 'text-[#5c6370]'
                    }`}>
                      {item.latestValue > 0 ? formatNumber(item.latestValue) : '—'}
                    </span>
                    {isIsolated && item.isTracking && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1d9bf0] animate-pulse shrink-0" title="Tracking — projection shown" />
                    )}
                  </button>

                  {showPreview === id && (
                    <div className="absolute right-full top-0 mr-2 z-50 w-[300px] h-[200px] bg-[#111214] rounded-xl border border-[#2a2d32] shadow-2xl shadow-black/80 overflow-hidden pointer-events-none">
                      <iframe
                        src={`https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=dark&hideCard=true&hideThread=true`}
                        className="w-full pointer-events-none absolute"
                        style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '134%', height: '350px', top: '-4px', left: '0' }}
                        scrolling="no"
                        loading="lazy"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
