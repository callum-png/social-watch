'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { usePostTracker } from '../context';
import TrajectoryChart, { projectTrend, projectEngagementLog } from '@/components/post-tracker/TrajectoryChart';
import { computeHistoricalMedian, extractMetrics, formatNumber } from '@/lib/post-tracker-api';

type Metric = 'views' | 'likes' | 'retweets' | 'replies';
const COLORS = ['#1d9bf0','#00ba7c','#f59e0b','#e879f9','#f4212e','#a78bfa','#34d399','#fb923c','#60a5fa','#f472b6'];

export default function TrajectoryPage() {
  const { posts, loading, error, completedPosts } = usePostTracker();
  const [selectedMetric, setSelectedMetric] = useState<Metric>('views');
  const [selectedProfile, setSelectedProfile] = useState<string>('all');
  const [isolatedIds, setIsolatedIds] = useState<Set<string> | null>(null);
  const [shareToast, setShareToast] = useState(false);

  // Auto-spotlight the most recent / live post on load
  useEffect(() => {
    if (posts.length > 0 && !isolatedIds) {
      const sorted = [...posts].sort((a, b) => {
        if (a['Status'] === 'tracking' && b['Status'] !== 'tracking') return -1;
        if (b['Status'] === 'tracking' && a['Status'] !== 'tracking') return 1;
        return new Date(b['Date Added'] || 0).getTime() - new Date(a['Date Added'] || 0).getTime();
      });
      setIsolatedIds(new Set([sorted[0]['Post ID']]));
    }
  }, [posts]);

  const profiles = useMemo(() => {
    const handles = new Set(posts.map(p => p['Account Handle']));
    return Array.from(handles).sort();
  }, [posts]);

  const handleProfileChange = useCallback((value: string) => {
    setSelectedProfile(value);
    if (value === 'all') {
      setIsolatedIds(null);
    } else {
      const ids = new Set(posts.filter(p => p['Account Handle'] === value).map(p => p['Post ID']));
      setIsolatedIds(ids);
    }
  }, [posts]);

  // Clicking a post in the sidebar/leaderboard switches the spotlight to that post
  const handleToggleIsolate = useCallback((postId: string) => {
    setSelectedProfile('all');
    setIsolatedIds(prev => {
      if (prev && prev.has(postId) && prev.size === 1) return null; // deselect if already the only one
      return new Set([postId]);
    });
  }, []);

  const historicalAverage = useMemo(() => computeHistoricalMedian(completedPosts), [completedPosts]);

  const handleShare = () => {
    const ids = isolatedIds && isolatedIds.size > 0
      ? Array.from(isolatedIds).join(',')
      : posts.map(p => p['Post ID']).join(',');
    const url = `${window.location.origin}/share?p=${ids}&metric=${selectedMetric}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    });
  };

  // Spotlight post stats
  const spotlightPost = useMemo(() => {
    if (!isolatedIds || isolatedIds.size !== 1) return null;
    return posts.find(p => isolatedIds.has(p['Post ID'])) ?? null;
  }, [posts, isolatedIds]);

  const spotlightStats = useMemo(() => {
    if (!spotlightPost) return null;
    const metrics = extractMetrics(spotlightPost).filter(m => m.hasData);
    if (metrics.length === 0) return null;
    const latest = metrics[metrics.length - 1];
    const currentVal = latest[selectedMetric] as number;

    let velocity: number | null = null;
    if (metrics.length >= 2) {
      const prev = metrics[metrics.length - 2];
      const hrs = (latest.minutes - prev.minutes) / 60;
      if (hrs > 0) velocity = Math.round(((latest[selectedMetric] as number) - (prev[selectedMetric] as number)) / hrs);
    }

    const allLatest = posts
      .map(p => {
        const m = extractMetrics(p).filter(x => x.hasData);
        return { id: p['Post ID'], val: m.length ? m[m.length - 1][selectedMetric] as number : 0 };
      })
      .sort((a, b) => b.val - a.val);
    const rank = allLatest.findIndex(x => x.id === spotlightPost['Post ID']) + 1;

    const benchmarkPoint = historicalAverage.find(h => h.checkpoint === latest.checkpoint);
    const benchmarkVal = benchmarkPoint ? benchmarkPoint[selectedMetric] as number : null;
    const vsBenchmark = benchmarkVal && benchmarkVal > 0
      ? Math.round(((currentVal - benchmarkVal) / benchmarkVal) * 100)
      : null;

    const dataPoints = metrics.map(m => ({ minutes: m.minutes, value: m[selectedMetric] as number }));
    const futureTargets = [1440, 2880].filter(t => t > latest.minutes);
    const projected = futureTargets.length > 0
      ? selectedMetric === 'views'
        ? projectTrend(dataPoints, futureTargets)
        : projectEngagementLog(dataPoints, futureTargets)
      : [];

    return {
      currentVal,
      checkpoint: latest.displayLabel,
      velocity,
      rank,
      total: posts.length,
      vsBenchmark,
      proj24h: projected.find(p => p.minutes === 1440)?.value ?? null,
      proj48h: projected.find(p => p.minutes === 2880)?.value ?? null,
    };
  }, [spotlightPost, selectedMetric, posts, historicalAverage]);

  // Time-of-day performance (6am–6pm Eastern, all posts)
  const timeOfDayData = useMemo(() => {
    const HOURS = Array.from({ length: 13 }, (_, i) => i + 6); // 6..18
    const buckets: Record<number, { count: number; totalViews: number }> = {};
    HOURS.forEach(h => { buckets[h] = { count: 0, totalViews: 0 }; });

    for (const post of posts) {
      const dateStr = post['Date Posted'];
      if (!dateStr) continue;

      // Dates stored as naive UTC ISO — append Z so JS treats them as UTC
      const normalized = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
      const date = new Date(normalized);
      if (isNaN(date.getTime())) continue;

      // Convert to Eastern time (handles EST/EDT automatically via IANA tz)
      const easternHour = parseInt(
        date.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }),
        10
      );
      if (easternHour < 6 || easternHour > 18) continue;

      // Use peak (last available) views
      const metrics = extractMetrics(post).filter(m => m.hasData);
      const peakViews = metrics.length > 0 ? metrics[metrics.length - 1].views : 0;

      buckets[easternHour].count++;
      buckets[easternHour].totalViews += peakViews;
    }

    return HOURS.map(h => ({
      hour: h,
      label: h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`,
      count: buckets[h].count,
      avgViews: buckets[h].count > 0 ? Math.round(buckets[h].totalViews / buckets[h].count) : 0,
    }));
  }, [posts]);

  // Leaderboard — all posts sorted by current metric value
  const leaderboard = useMemo(() => {
    return [...posts]
      .map((post, idx) => {
        const metrics = extractMetrics(post).filter(m => m.hasData);
        const latest = metrics.length ? metrics[metrics.length - 1] : null;
        const val = latest ? latest[selectedMetric] as number : 0;
        // Compute per-hour rate
        let perHour: number | null = null;
        if (latest && metrics.length >= 2) {
          const prev = metrics[metrics.length - 2];
          const hrs = (latest.minutes - prev.minutes) / 60;
          if (hrs > 0) perHour = Math.round(((latest[selectedMetric] as number) - (prev[selectedMetric] as number)) / hrs);
        } else if (latest && latest.minutes > 0) {
          perHour = Math.round((latest[selectedMetric] as number) / (latest.minutes / 60));
        }
        let trend: 'up' | 'flat' | null = null;
        if (metrics.length >= 2) {
          const prev = metrics[metrics.length - 2][selectedMetric] as number;
          trend = val > prev ? 'up' : 'flat';
        }
        return {
          post,
          val,
          perHour,
          checkpoint: latest?.displayLabel ?? '',
          trend,
          color: COLORS[idx % COLORS.length],
        };
      })
      .sort((a, b) => b.val - a.val);
  }, [posts, selectedMetric]);

  const topVal = leaderboard.length > 0 ? leaderboard[0].val : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1d9bf0] border-t-transparent" />
      </div>
    );
  }
  if (error) {
    return <div className="bg-[#f4212e]/10 border border-[#f4212e]/20 rounded-xl p-4 text-[#f4212e] text-xs">{error}</div>;
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <select
            value={selectedProfile}
            onChange={(e) => handleProfileChange(e.target.value)}
            className="bg-[#111214] border border-[#2a2d32] rounded-lg px-2.5 py-1.5 text-xs text-white appearance-none cursor-pointer hover:border-[#3a3d42] focus:outline-none focus:border-[#1d9bf0] transition-colors"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%235c6370' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '26px' }}
          >
            <option value="all">All Profiles</option>
            {profiles.map(handle => <option key={handle} value={handle}>@{handle}</option>)}
          </select>
          {isolatedIds && (
            <button
              onClick={() => { setIsolatedIds(null); setSelectedProfile('all'); }}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#2a2d32] text-[#5c6370] hover:text-white hover:border-[#3a3d42] transition-all"
            >
              Show all
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-px bg-[#0d0e10] rounded-lg p-px border border-[#2a2d32]">
            {(['views', 'likes', 'retweets', 'replies'] as Metric[]).map((m) => (
              <button key={m} onClick={() => setSelectedMetric(m)}
                className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition-all ${selectedMetric === m ? 'bg-[#1d9bf0] text-white' : 'text-[#5c6370] hover:text-white'}`}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative">
            <button onClick={handleShare}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#2a2d32] text-[#5c6370] hover:text-white hover:border-[#3a3d42] transition-all bg-[#111214]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Share
            </button>
            {shareToast && <div className="absolute top-full mt-1.5 right-0 bg-[#00ba7c] text-white text-[10px] font-medium px-2 py-1 rounded whitespace-nowrap z-50">Link copied!</div>}
          </div>
        </div>
      </div>

      {/* Spotlight strip — shows when one post is focused */}
      {spotlightPost && spotlightStats && (
        <div className="bg-[#111214] rounded-xl border border-[#2a2d32] px-4 py-3 flex items-center gap-x-6 gap-y-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            {spotlightPost['Status'] === 'tracking' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ba7c] animate-pulse shrink-0" />
            )}
            <span className="text-sm font-semibold text-white">@{spotlightPost['Account Handle']}</span>
            {spotlightPost['Campaign'] && (
              <span className="text-xs text-[#7856ff] font-medium">#{spotlightPost['Campaign']}</span>
            )}
          </div>
          <div className="h-3 w-px bg-[#2a2d32] hidden sm:block" />
          <StatPill label={spotlightStats.checkpoint} value={formatNumber(spotlightStats.currentVal)} />
          {spotlightStats.velocity !== null && (
            <StatPill
              label="velocity"
              value={`${spotlightStats.velocity >= 0 ? '+' : ''}${formatNumber(spotlightStats.velocity)}/hr`}
              color={spotlightStats.velocity >= 0 ? '#00ba7c' : '#f4212e'}
            />
          )}
          {spotlightStats.proj24h !== null && (
            <StatPill label="proj 24h" value={formatNumber(spotlightStats.proj24h)} color="#8b9199" />
          )}
          {spotlightStats.vsBenchmark !== null && (
            <StatPill
              label="vs avg"
              value={`${spotlightStats.vsBenchmark >= 0 ? '+' : ''}${spotlightStats.vsBenchmark}%`}
              color={spotlightStats.vsBenchmark >= 0 ? '#00ba7c' : '#f4212e'}
            />
          )}
          <StatPill label="rank" value={`#${spotlightStats.rank} of ${spotlightStats.total}`} color="#f59e0b" />
        </div>
      )}

      {/* Chart */}
      <div className="bg-[#111214] rounded-xl border border-[#2a2d32] p-4 relative z-10">
        <TrajectoryChart
          posts={posts}
          metric={selectedMetric}
          historicalAverage={historicalAverage}
          isolatedIds={isolatedIds}
          onToggleIsolate={handleToggleIsolate}
        />
      </div>

      {/* Time of Day Performance */}
      {posts.length > 0 && (() => {
        const maxAvg = Math.max(...timeOfDayData.map(d => d.avgViews), 1);
        return (
          <div className="bg-[#111214] rounded-xl border border-[#2a2d32] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold">
                Launch Time Performance · Eastern
              </p>
              <span className="text-[10px] text-[#3a3d42]">6 AM – 6 PM</span>
            </div>
            <div className="space-y-1.5">
              {timeOfDayData.map(({ hour, label, count, avgViews }) => {
                const barPct = maxAvg > 0 ? (avgViews / maxAvg) * 100 : 0;
                const isEmpty = count === 0;
                return (
                  <div key={hour} className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono text-[#5c6370] w-8 shrink-0 text-right">{label}</span>
                    <div className="flex-1 h-4 bg-[#0d0e10] rounded overflow-hidden relative">
                      {!isEmpty && (
                        <div
                          className="h-full rounded transition-all duration-500"
                          style={{ width: `${barPct}%`, backgroundColor: barPct > 60 ? '#1d9bf0' : barPct > 30 ? '#1d9bf066' : '#1d9bf033' }}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 w-28 justify-end">
                      {!isEmpty ? (
                        <>
                          <span className="text-[9px] text-[#3a3d42] font-medium">
                            {count} launch{count !== 1 ? 'es' : ''}
                          </span>
                          <span className="text-[10px] font-bold font-mono tabular-nums text-white">
                            {formatNumber(avgViews)}
                          </span>
                        </>
                      ) : (
                        <span className="text-[9px] text-[#2a2d32]">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-[#3a3d42] mt-2.5">Avg peak views by launch hour · {posts.length} post{posts.length !== 1 ? 's' : ''}</p>
          </div>
        );
      })()}

      {/* Leaderboard */}
      <div className="bg-[#111214] rounded-xl border border-[#2a2d32] p-4">
        <p className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold mb-3">
          All Launches — {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}
        </p>
        <div className="space-y-0.5">
          {leaderboard.map((item, rank) => {
            const id = item.post['Post ID'];
            const isSpotlit = isolatedIds?.has(id);
            const barPct = topVal > 0 ? (item.val / topVal) * 100 : 0;
            const isLive = item.post['Status'] === 'tracking';
            return (
              <button
                key={id}
                onClick={() => handleToggleIsolate(id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left group ${
                  isSpotlit ? 'bg-white/[0.05] border border-[#2a2d32]' : 'border border-transparent hover:bg-white/[0.02]'
                }`}
              >
                <span className="text-[11px] font-bold text-[#3a3d42] w-4 shrink-0 tabular-nums text-right">{rank + 1}</span>
                <span className="w-2 h-2 rounded-full shrink-0 relative" style={{ backgroundColor: item.color }}>
                  {isLive && <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: item.color, opacity: 0.4 }} />}
                </span>
                <span className={`text-xs font-medium truncate flex-1 transition-colors ${isSpotlit ? 'text-white' : 'text-[#8b9199] group-hover:text-white'}`}>
                  @{item.post['Account Handle']}
                  {item.post['Campaign'] && <span className="text-[#5c6370] ml-1.5 font-normal">#{item.post['Campaign']}</span>}
                </span>
                <span className="text-[10px] text-[#3a3d42] shrink-0 hidden sm:block">{item.checkpoint}</span>
                <div className="w-16 h-1 bg-[#1a1c20] rounded-full overflow-hidden shrink-0 hidden sm:block">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${barPct}%`, backgroundColor: item.color, opacity: isSpotlit ? 1 : 0.4 }}
                  />
                </div>
                <div className="flex flex-col items-end shrink-0 w-16">
                  <span className={`text-xs font-bold tabular-nums leading-none ${isSpotlit ? 'text-white' : 'text-[#5c6370]'}`}>
                    {item.val > 0 ? formatNumber(item.val) : '—'}
                  </span>
                  {item.perHour !== null && item.perHour > 0 && (
                    <span className={`text-[9px] tabular-nums leading-none mt-0.5 ${item.trend === 'up' ? 'text-[#00ba7c]' : 'text-[#3a3d42]'}`}>
                      +{formatNumber(item.perHour)}/hr
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[9px] text-[#5c6370] uppercase tracking-wider font-semibold leading-none mb-0.5">{label}</div>
      <div className="text-sm font-bold font-mono tabular-nums leading-none" style={{ color: color || 'white' }}>{value}</div>
    </div>
  );
}
