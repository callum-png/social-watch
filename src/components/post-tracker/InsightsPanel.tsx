'use client';

import { PTPost, extractMetrics, formatNumber } from '@/lib/post-tracker-api';
import { useMemo } from 'react';

interface InsightsPanelProps {
  posts: PTPost[];
  metric: 'views' | 'likes' | 'retweets' | 'replies';
  totalSelected?: number;
}

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32', '#1d9bf0', '#1d9bf0'];

/** Parse a Date Posted string as UTC (backend stores naive UTC datetimes) and return a Date in EST. */
function parseDateAsUTC(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Append Z if no timezone marker so JS treats it as UTC
  const normalized = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

/** Get the hour (0-23) in EST (UTC-5) from a UTC Date. */
function getESTHour(d: Date): number {
  return (d.getUTCHours() - 5 + 24) % 24;
}

/** Get the day of week (0=Sun, 6=Sat) in EST from a UTC Date. */
function getESTDay(d: Date): number {
  // If UTC hour < 5 (i.e. EST is previous day), adjust the day
  const estOffset = d.getUTCHours() < 5 ? -1 : 0;
  return (d.getUTCDay() + estOffset + 7) % 7;
}

function isShownPost(post: PTPost): boolean {
  return post['Shown'] === 'true';
}

function MiniRankBadge({ rank }: { rank: number }) {
  const color = RANK_COLORS[rank - 1] || '#5c6370';
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
      style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}50` }}
    >
      {rank}
    </div>
  );
}

export default function InsightsPanel({ posts, metric }: InsightsPanelProps) {
  const stats = useMemo(() => {
    if (posts.length === 0) return null;

    const postMetrics = posts.map(post => {
      const metrics = extractMetrics(post);
      if (metrics.length === 0) return null;
      const peak = Math.max(...metrics.map(m => m[metric]));
      const peakViews = Math.max(...metrics.map(m => m.views));
      const peakLikes = Math.max(...metrics.map(m => m.likes));
      const peakRetweets = Math.max(...metrics.map(m => m.retweets));
      const peakReplies = Math.max(...metrics.map(m => m.replies));

      return {
        post,
        peak,
        peakViews,
        peakLikes,
        peakRetweets,
        peakReplies,
        isShown: isShownPost(post),
        metrics,
      };
    }).filter((v): v is NonNullable<typeof v> => v !== null);

    if (postMetrics.length === 0) return null;

    // KPI calculations — averages per post for each metric
    const avgViews = Math.round(postMetrics.reduce((s, p) => s + p.peakViews, 0) / postMetrics.length);
    const avgLikes = Math.round(postMetrics.reduce((s, p) => s + p.peakLikes, 0) / postMetrics.length);
    const avgRetweets = Math.round(postMetrics.reduce((s, p) => s + p.peakRetweets, 0) / postMetrics.length);
    const avgReplies = Math.round(postMetrics.reduce((s, p) => s + p.peakReplies, 0) / postMetrics.length);

    // Engagement rate from peak values
    const totalEngagement = postMetrics.reduce((s, p) => s + p.peakLikes + p.peakRetweets + p.peakReplies, 0);
    const totalViews = postMetrics.reduce((s, p) => s + p.peakViews, 0);
    const engagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

    const peakValues = postMetrics.map(p => p.peak);

    // Shown vs Field
    const shownPosts = postMetrics.filter(p => p.isShown);
    const fieldPosts = postMetrics.filter(p => !p.isShown);
    const hasShown = shownPosts.length > 0 && fieldPosts.length > 0;

    // Leaderboard (top 5)
    const leaderboard = [...postMetrics]
      .sort((a, b) => b.peak - a.peak)
      .slice(0, 5)
      .map((item, i) => ({
        ...item,
        rank: i + 1,
        percentOfTop: postMetrics.length > 0
          ? (item.peak / Math.max(...peakValues)) * 100
          : 0,
      }));

    // Performance breakdown — per-handle averages
    const handleMap = new Map<string, { views: number[]; likes: number[]; retweets: number[]; replies: number[]; isShown: boolean }>();
    for (const pm of postMetrics) {
      const handle = pm.post['Account Handle'];
      if (!handleMap.has(handle)) {
        handleMap.set(handle, { views: [], likes: [], retweets: [], replies: [], isShown: pm.isShown });
      }
      const entry = handleMap.get(handle)!;
      entry.views.push(pm.peakViews);
      entry.likes.push(pm.peakLikes);
      entry.retweets.push(pm.peakRetweets);
      entry.replies.push(pm.peakReplies);
    }
    const handleBreakdown = Array.from(handleMap.entries())
      .map(([handle, data]) => ({
        handle,
        postCount: data.views.length,
        avgViews: Math.round(data.views.reduce((s, v) => s + v, 0) / data.views.length),
        avgLikes: Math.round(data.likes.reduce((s, v) => s + v, 0) / data.likes.length),
        avgRetweets: Math.round(data.retweets.reduce((s, v) => s + v, 0) / data.retweets.length),
        avgReplies: Math.round(data.replies.reduce((s, v) => s + v, 0) / data.replies.length),
        isShown: data.isShown,
      }))
      .sort((a, b) => b.avgViews - a.avgViews)
      .slice(0, 5);

    // Shown vs Others comparison (only if both groups exist)
    let shownComparison: { shownAvgViews: number; othersAvgViews: number; shownAvgLikes: number; othersAvgLikes: number; shownAvgEngagement: number; othersAvgEngagement: number } | null = null;
    if (hasShown) {
      const shownAvgV = shownPosts.reduce((s, p) => s + p.peakViews, 0) / shownPosts.length;
      const othersAvgV = fieldPosts.reduce((s, p) => s + p.peakViews, 0) / fieldPosts.length;
      const shownAvgL = shownPosts.reduce((s, p) => s + p.peakLikes, 0) / shownPosts.length;
      const othersAvgL = fieldPosts.reduce((s, p) => s + p.peakLikes, 0) / fieldPosts.length;
      const shownTotalEng = shownPosts.reduce((s, p) => s + p.peakLikes + p.peakRetweets + p.peakReplies, 0);
      const shownTotalV = shownPosts.reduce((s, p) => s + p.peakViews, 0);
      const othersTotalEng = fieldPosts.reduce((s, p) => s + p.peakLikes + p.peakRetweets + p.peakReplies, 0);
      const othersTotalV = fieldPosts.reduce((s, p) => s + p.peakViews, 0);
      shownComparison = {
        shownAvgViews: shownAvgV, othersAvgViews: othersAvgV,
        shownAvgLikes: shownAvgL, othersAvgLikes: othersAvgL,
        shownAvgEngagement: shownTotalV > 0 ? (shownTotalEng / shownTotalV) * 100 : 0,
        othersAvgEngagement: othersTotalV > 0 ? (othersTotalEng / othersTotalV) * 100 : 0,
      };
    }

    // Day-of-week averages (in EST)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    for (const pm of postMetrics) {
      const d = parseDateAsUTC(pm.post['Date Posted']);
      if (!d) continue;
      const day = getESTDay(d);
      dayTotals[day] += pm.peak;
      dayCounts[day] += 1;
    }
    const dayAvgs = dayNames.map((name, i) => ({
      day: name,
      avg: dayCounts[i] > 0 ? Math.round(dayTotals[i] / dayCounts[i]) : 0,
      count: dayCounts[i],
    }));
    // Reorder to Mon-Sun
    const dayOfWeek = [...dayAvgs.slice(1), dayAvgs[0]];

    // Launches by hour of day (EST) + average views per hour
    const hourCounts = new Array(24).fill(0);
    const hourViewTotals = new Array(24).fill(0);
    for (const pm of postMetrics) {
      const d = parseDateAsUTC(pm.post['Date Posted']);
      if (!d) continue;
      const h = getESTHour(d);
      hourCounts[h] += 1;
      hourViewTotals[h] += pm.peakViews;
    }
    const launchesByHour = hourCounts.map((count, hour) => {
      const ampm = hour < 12 ? 'a' : 'p';
      const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return { hour, label: `${h}${ampm}`, count, avgViews: count > 0 ? Math.round(hourViewTotals[hour] / count) : 0 };
    });

    // Top Today & Top This Week
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    function findTopPost(since: Date) {
      const recent = postMetrics.filter(p => {
        const d = parseDateAsUTC(p.post['Date Posted']);
        return d ? d.getTime() >= since.getTime() : false;
      });
      if (recent.length === 0) return null;
      const top = recent.reduce((best, cur) => cur.peak > best.peak ? cur : best, recent[0]);
      return { handle: top.post['Account Handle'], value: top.peak, postUrl: top.post['Post URL'] || '' };
    }

    const topToday = findTopPost(oneDayAgo);
    const topThisWeek = findTopPost(oneWeekAgo);

    return {
      avgViews,
      avgLikes,
      avgRetweets,
      avgReplies,
      engagementRate,
      totalPosts: postMetrics.length,
      hasShown,
      leaderboard,
      handleBreakdown,
      shownComparison,
      topToday,
      topThisWeek,
      dayOfWeek,
      launchesByHour,
    };
  }, [posts, metric]);

  if (!stats || posts.length === 0) {
    return (
      <div className="bg-[#0d0e10] rounded-lg border border-[#1a1c20] px-4 py-3">
        <p className="text-[10px] text-[#5c6370]">Add tracked posts to see performance stats</p>
      </div>
    );
  }

  const metricLabel = metric === 'views' ? 'Views' : metric === 'likes' ? 'Likes' : metric === 'retweets' ? 'RTs' : 'Replies';

  return (
    <div className="space-y-2">
      {/* Section A — KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        <KPICard
          label="Avg Views"
          value={formatNumber(stats.avgViews)}
          context="per post"
          accent
        />
        <KPICard
          label="Avg Replies"
          value={formatNumber(stats.avgReplies)}
          context="per post"
        />
        <KPICard
          label="Avg Likes"
          value={formatNumber(stats.avgLikes)}
          context="per post"
        />
        <KPICard
          label="Avg Reposts"
          value={formatNumber(stats.avgRetweets)}
          context="per post"
        />
        <KPICard
          label="Engagement Rate"
          value={`${(stats.engagementRate ?? 0).toFixed(2)}%`}
          context="(L+RT+R) / views"
        />
        <KPICard
          label="Total Posts"
          value={String(stats.totalPosts)}
          context="tracked"
        />
        <KPICard
          label="Top This Week"
          value={stats.topThisWeek ? formatNumber(stats.topThisWeek.value) : '—'}
          context={stats.topThisWeek ? `@${stats.topThisWeek.handle}` : 'no posts this week'}
        />
      </div>

      {/* Section B + C — Leaderboard + Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Mini Leaderboard */}
        <div className="bg-[#0d0e10] rounded-lg border border-[#1a1c20] px-3 py-2">
          <p className="text-[9px] text-[#5c6370] uppercase tracking-wider font-semibold mb-1.5">Top 5 — {metricLabel}</p>
          <div className="space-y-1">
            {stats.leaderboard.map((item) => (
              <a
                key={item.post['Post ID']}
                href={item.post['Post URL'] || `https://x.com/${item.post['Account Handle']}/status/${item.post['Post ID']}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 h-7 hover:bg-white/5 rounded px-1 -mx-1 transition-colors cursor-pointer"
              >
                <MiniRankBadge rank={item.rank} />
                <div className="flex items-center gap-1 min-w-0 shrink w-[60px] sm:w-[80px]">
                  {item.isShown && (
                    <span className="text-[7px] font-bold bg-[#1d9bf0] text-white rounded px-0.5 leading-tight shrink-0">S</span>
                  )}
                  <span className="text-[11px] text-[#8b9199] truncate">@{item.post['Account Handle']}</span>
                </div>
                <div className="flex-1 h-1.5 bg-[#1a1c20] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.percentOfTop}%`,
                      backgroundColor: RANK_COLORS[item.rank - 1] || '#5c6370',
                      opacity: 0.7,
                    }}
                  />
                </div>
                <span className="text-[10px] font-bold text-white tabular-nums shrink-0 w-12 text-right">
                  {formatNumber(item.peak)}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Per-Handle Averages */}
        <div className="bg-[#0d0e10] rounded-lg border border-[#1a1c20] px-3 py-2">
          <p className="text-[9px] text-[#5c6370] uppercase tracking-wider font-semibold mb-1.5">Avg by Account</p>
          <div className="space-y-1">
            {stats.handleBreakdown.map((item) => (
              <div key={item.handle} className="flex items-center gap-2 h-6">
                <div className="flex items-center gap-1 min-w-0 w-[60px] sm:w-[80px]">
                  {item.isShown && (
                    <span className="text-[7px] font-bold bg-[#1d9bf0] text-white rounded px-0.5 leading-tight shrink-0">S</span>
                  )}
                  <span className="text-[10px] text-[#8b9199] truncate">@{item.handle}</span>
                </div>
                <div className="flex-1 flex items-center gap-2 justify-end">
                  <span className="text-[9px] text-[#5c6370]">{item.postCount}p</span>
                  <span className="text-[9px] text-white tabular-nums w-10 text-right" title="Avg Views">{formatNumber(item.avgViews)}</span>
                  <span className="text-[9px] text-[#f91880] tabular-nums w-8 text-right" title="Avg Likes">{formatNumber(item.avgLikes)}</span>
                  <span className="text-[9px] text-[#00ba7c] tabular-nums w-8 text-right" title="Avg Replies">{formatNumber(item.avgReplies)}</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-end gap-2 mt-1 pt-1 border-t border-[#1a1c20]">
              <span className="text-[8px] text-[#5c6370]">views</span>
              <span className="text-[8px] text-[#f91880]/60">likes</span>
              <span className="text-[8px] text-[#00ba7c]/60">replies</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section C2 — Shown vs Others (conditional) */}
      {stats.shownComparison && (
        <div className="bg-[#0d0e10] rounded-lg border border-[#1a1c20] px-3 py-2">
          <p className="text-[9px] text-[#5c6370] uppercase tracking-wider font-semibold mb-1.5">Shown vs Others</p>
          <div className="space-y-1.5">
            <ComparisonRow label="Avg Views" shownVal={stats.shownComparison.shownAvgViews} othersVal={stats.shownComparison.othersAvgViews} />
            <ComparisonRow label="Avg Likes" shownVal={stats.shownComparison.shownAvgLikes} othersVal={stats.shownComparison.othersAvgLikes} />
            <ComparisonRow label="Eng. Rate" shownVal={stats.shownComparison.shownAvgEngagement} othersVal={stats.shownComparison.othersAvgEngagement} isPercent />
          </div>
        </div>
      )}

      {/* Section D — Day of Week charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <DayOfWeekChart data={stats.dayOfWeek} metricLabel={metricLabel} />
        <LaunchesPerDayChart data={stats.dayOfWeek} />
      </div>

      {/* Section E — Launches by Time of Day */}
      <LaunchesByTimeChart data={stats.launchesByHour} />
    </div>
  );
}

function DayOfWeekChart({ data, metricLabel }: { data: { day: string; avg: number; count: number }[]; metricLabel: string }) {
  const max = Math.max(...data.map(d => d.avg), 1);
  const hasData = data.some(d => d.count > 0);

  if (!hasData) return null;

  return (
    <div className="bg-[#0d0e10] rounded-lg border border-[#1a1c20] px-3 py-2">
      <p className="text-[9px] text-[#5c6370] uppercase tracking-wider font-semibold mb-2">Avg {metricLabel} by Day</p>
      <div className="flex items-end gap-1.5 h-16">
        {data.map((d) => {
          const pct = max > 0 ? (d.avg / max) * 100 : 0;
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-[8px] text-[#5c6370] tabular-nums">{d.avg > 0 ? formatNumber(d.avg) : ''}</span>
              <div className="w-full flex items-end" style={{ height: '36px' }}>
                <div
                  className="w-full rounded-sm bg-[#1d9bf0]"
                  style={{ height: `${Math.max(pct, d.count > 0 ? 4 : 0)}%`, opacity: d.count > 0 ? 0.7 : 0.15 }}
                />
              </div>
              <span className="text-[8px] text-[#5c6370] font-medium">{d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LaunchesPerDayChart({ data }: { data: { day: string; avg: number; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const hasData = data.some(d => d.count > 0);

  if (!hasData) return null;

  return (
    <div className="bg-[#0d0e10] rounded-lg border border-[#1a1c20] px-3 py-2">
      <p className="text-[9px] text-[#5c6370] uppercase tracking-wider font-semibold mb-2">Launches by Day</p>
      <div className="flex items-end gap-1.5 h-16">
        {data.map((d) => {
          const pct = max > 0 ? (d.count / max) * 100 : 0;
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-[8px] text-[#5c6370] tabular-nums">{d.count > 0 ? d.count : ''}</span>
              <div className="w-full flex items-end" style={{ height: '36px' }}>
                <div
                  className="w-full rounded-sm bg-[#8b5cf6]"
                  style={{ height: `${Math.max(pct, d.count > 0 ? 4 : 0)}%`, opacity: d.count > 0 ? 0.7 : 0.15 }}
                />
              </div>
              <span className="text-[8px] text-[#5c6370] font-medium">{d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LaunchesByTimeChart({ data }: { data: { hour: number; label: string; count: number; avgViews: number }[] }) {
  // Filter to 6am–7pm EST only
  const filtered = data.filter(d => d.hour >= 6 && d.hour <= 19);
  const maxCount = Math.max(...filtered.map(d => d.count), 1);
  const maxViews = Math.max(...filtered.map(d => d.avgViews), 1);
  const hasData = filtered.some(d => d.count > 0);

  if (!hasData) return null;

  return (
    <div className="bg-[#0d0e10] rounded-lg border border-[#1a1c20] px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold">By Time of Day <span className="normal-case">(EST)</span></p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#10b981] opacity-70" />
            <span className="text-[9px] text-[#5c6370]">Launches</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#1d9bf0] opacity-70" />
            <span className="text-[9px] text-[#5c6370]">Avg Views</span>
          </div>
        </div>
      </div>
      <div className="flex items-end gap-1" style={{ height: '180px' }}>
        {filtered.map((d) => {
          const countPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
          const viewsPct = maxViews > 0 ? (d.avgViews / maxViews) * 100 : 0;
          const countH = Math.max(countPct, d.count > 0 ? 6 : 0);
          const viewsH = Math.max(viewsPct, d.avgViews > 0 ? 6 : 0);
          return (
            <div key={d.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
              {/* Hover tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block z-20 pointer-events-none">
                <div className="bg-[#1a1c20] border border-[#2a2d32] rounded-md px-2 py-1.5 shadow-lg whitespace-nowrap">
                  <p className="text-[10px] font-semibold text-white mb-0.5">{d.label} EST</p>
                  <p className="text-[9px] text-[#10b981]">{d.count} launch{d.count !== 1 ? 'es' : ''}</p>
                  <p className="text-[9px] text-[#1d9bf0]">{formatNumber(d.avgViews)} avg views</p>
                </div>
              </div>
              <div className="w-full flex items-end gap-px" style={{ height: '148px' }}>
                <div
                  className="flex-1 rounded-sm bg-[#10b981] relative flex items-center justify-center overflow-hidden"
                  style={{ height: `${countH}%`, opacity: d.count > 0 ? 0.8 : 0.15 }}
                >
                  {d.count > 0 && countH > 12 && (
                    <span className="text-[9px] font-bold text-white drop-shadow-sm">{d.count}</span>
                  )}
                </div>
                <div
                  className="flex-1 rounded-sm bg-[#1d9bf0] relative flex items-center justify-center overflow-hidden"
                  style={{ height: `${viewsH}%`, opacity: d.avgViews > 0 ? 0.8 : 0.15 }}
                >
                  {d.avgViews > 0 && viewsH > 12 && (
                    <span className="text-[8px] font-bold text-white drop-shadow-sm">{formatNumber(d.avgViews)}</span>
                  )}
                </div>
              </div>
              <span className="text-[9px] text-[#5c6370] font-medium">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KPICard({ label, value, context, accent }: { label: string; value: string; context: string; accent?: boolean }) {
  return (
    <div className="bg-[#0d0e10] rounded-lg border border-[#1a1c20] px-3 py-2">
      <p className="text-[9px] text-[#5c6370] uppercase tracking-wider font-semibold mb-0.5">{label}</p>
      <p className={`text-sm font-bold tabular-nums truncate ${accent ? 'text-[#1d9bf0]' : 'text-white'}`}>{value}</p>
      <p className="text-[9px] text-[#3a3d42] truncate">{context}</p>
    </div>
  );
}

function ComparisonRow({ label, shownVal, othersVal, isPercent }: { label: string; shownVal: number; othersVal: number; isPercent?: boolean }) {
  const delta = othersVal > 0 ? ((shownVal - othersVal) / othersVal) * 100 : 0;
  const isPositive = delta >= 0;

  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-[#5c6370]">{label}</span>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="text-[9px] text-[#1d9bf0] mr-1">S</span>
          <span className="text-[10px] font-bold text-white tabular-nums">
            {isPercent ? `${(shownVal ?? 0).toFixed(2)}%` : formatNumber(Math.round(shownVal ?? 0))}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-[#8b9199] tabular-nums">
            {isPercent ? `${(othersVal ?? 0).toFixed(2)}%` : formatNumber(Math.round(othersVal ?? 0))}
          </span>
        </div>
        <span className={`text-[9px] font-semibold tabular-nums ${isPositive ? 'text-[#00ba7c]' : 'text-[#f4212e]'}`}>
          {isPositive ? '+' : ''}{(delta ?? 0).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
