'use client';

import { useState, useEffect, useMemo, useCallback, use } from 'react';
import TrajectoryChart from '@/components/post-tracker/TrajectoryChart';
import { PTPost, extractMetrics, formatNumber, ALL_CHECKPOINTS, CheckpointData, computeHistoricalMedian } from '@/lib/post-tracker-api';

type Metric = 'views' | 'likes' | 'retweets' | 'replies';

export default function LaunchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [posts, setPosts] = useState<PTPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<Metric>('views');
  const [isolatedIds, setIsolatedIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    fetch('/api/share/directory')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then(data => {
        setPosts(data.posts || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load launch data');
        setLoading(false);
      });
  }, []);

  // Match slug to a handle (case-insensitive)
  const matchedPost = useMemo(() => {
    return posts.find(p => p['Account Handle'].toLowerCase() === slug.toLowerCase());
  }, [posts, slug]);

  // Auto-isolate the matched post
  useEffect(() => {
    if (matchedPost && !isolatedIds) {
      setIsolatedIds(new Set([matchedPost['Post ID']]));
    }
  }, [matchedPost, isolatedIds]);

  const handleToggleIsolate = useCallback((postId: string) => {
    setIsolatedIds(prev => {
      if (prev && prev.has(postId) && prev.size === 1) {
        // Clicking the only isolated post — keep it (don't deselect all)
        return prev;
      }
      // Solo-select this post
      return new Set([postId]);
    });
  }, []);

  const completedPosts = useMemo(() => posts.filter(p => p['Status'] === 'complete'), [posts]);

  const historicalAverage = useMemo(() => {
    return computeHistoricalMedian(completedPosts);
  }, [completedPosts]);

  // Stats for the isolated post(s)
  const stats = useMemo(() => {
    const targetPosts = isolatedIds && isolatedIds.size > 0
      ? posts.filter(p => isolatedIds.has(p['Post ID']))
      : matchedPost ? [matchedPost] : [];

    if (targetPosts.length === 0) return null;

    const postMetrics = targetPosts.map(post => {
      const metrics = extractMetrics(post);
      if (metrics.length === 0) return null;
      const latest = metrics[metrics.length - 1];

      let viewsPerHour = 0;
      let likesPerHour = 0;
      if (metrics.length >= 2) {
        if (post['Status'] === 'tracking') {
          const prev = metrics[metrics.length - 2];
          const hourGap = (latest.minutes - prev.minutes) / 60;
          if (hourGap > 0) {
            viewsPerHour = (latest.views - prev.views) / hourGap;
            likesPerHour = (latest.likes - prev.likes) / hourGap;
          }
        } else {
          const first = metrics[0];
          const totalHours = (latest.minutes - first.minutes) / 60;
          if (totalHours > 0) {
            viewsPerHour = (latest.views - first.views) / totalHours;
            likesPerHour = (latest.likes - first.likes) / totalHours;
          }
        }
      }

      const engRate = latest.views > 0
        ? ((latest.likes + latest.retweets + latest.replies) / latest.views) * 100
        : 0;

      return {
        post,
        latest,
        metrics,
        viewsPerHour,
        likesPerHour,
        engRate,
        isTracking: post['Status'] === 'tracking',
      };
    }).filter((v): v is NonNullable<typeof v> => v !== null);

    if (postMetrics.length === 0) return null;

    const totalViews = postMetrics.reduce((s, p) => s + p.latest.views, 0);
    const totalLikes = postMetrics.reduce((s, p) => s + p.latest.likes, 0);
    const avgEngRate = postMetrics.reduce((s, p) => s + p.engRate, 0) / postMetrics.length;
    const avgViewsPerHour = postMetrics.reduce((s, p) => s + p.viewsPerHour, 0) / postMetrics.length;
    const avgLikesPerHour = postMetrics.reduce((s, p) => s + p.likesPerHour, 0) / postMetrics.length;
    const trackingCount = postMetrics.filter(p => p.isTracking).length;

    return {
      totalViews,
      totalLikes,
      avgEngRate,
      avgViewsPerHour,
      avgLikesPerHour,
      postCount: postMetrics.length,
      trackingCount,
      postMetrics,
    };
  }, [posts, matchedPost, isolatedIds]);

  // All handles for navigation (sorted: active first, then alphabetical)
  const handleList = useMemo(() => {
    return posts
      .map(p => ({
        handle: p['Account Handle'],
        slug: p['Account Handle'].toLowerCase(),
        isActive: p['Status'] === 'tracking',
        postId: p['Post ID'],
      }))
      .sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return a.handle.localeCompare(b.handle);
      });
  }, [posts]);

  // The display name for the header
  const displayName = matchedPost
    ? `@${matchedPost['Account Handle']}`
    : slug;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1d9bf0] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-6">
        <div className="bg-[#111214] rounded-xl border border-[#2a2d32] p-8 text-center max-w-md">
          <p className="text-[#5c6370] text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!matchedPost) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-6">
        <div className="bg-[#111214] rounded-xl border border-[#2a2d32] p-8 text-center max-w-md">
          <p className="text-white text-lg font-bold mb-2">Post not found</p>
          <p className="text-[#5c6370] text-sm mb-6">No post matches &ldquo;{slug}&rdquo;</p>
          {handleList.length > 0 && (
            <div className="text-left">
              <p className="text-[9px] text-[#5c6370] uppercase tracking-wider font-semibold mb-2">Available launches</p>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {handleList.map(h => (
                  <a
                    key={h.postId}
                    href={`/launch/${h.slug}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1a1c20] transition-colors"
                  >
                    <span className="text-sm text-white">@{h.handle}</span>
                    {h.isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00ba7c]" />
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Header */}
      <header className="border-b border-[#1a1c20]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <img src="/favicon.svg" alt="" className="h-7 w-7" />
              <span className="text-sm font-bold text-[#5c6370] tracking-tight">Shown Media</span>
            </div>
            <div className="w-px h-6 bg-[#1a1c20]" />
            <div>
              <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold">Launch Post Tracker</div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{displayName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {matchedPost['Status'] === 'tracking' && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#00ba7c]/15 text-[#00ba7c] ring-1 ring-[#00ba7c]/30">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00ba7c] animate-pulse mr-1.5 align-middle" />
                Live
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Handle navigation — click through launches */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {handleList.map(h => (
            <a
              key={h.postId}
              href={`/launch/${h.slug}`}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                h.slug === slug.toLowerCase()
                  ? 'bg-white text-black border-white'
                  : 'text-[#5c6370] border-[#2a2d32] hover:text-white hover:border-[#5c6370]'
              }`}
            >
              @{h.handle}
              {h.isActive && h.slug !== slug.toLowerCase() && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00ba7c] ml-1.5 align-middle" />
              )}
            </a>
          ))}
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-5 gap-3">
            <StatCard label="Views" value={formatNumber(stats.totalViews)} />
            <StatCard label="Likes" value={formatNumber(stats.totalLikes)} />
            <StatCard label="Engagement" value={`${(stats.avgEngRate ?? 0).toFixed(2)}%`} sub="(L+RT+R)/V" />
            <StatCard
              label="Views / Hour"
              value={stats.avgViewsPerHour > 0 ? formatNumber(Math.round(stats.avgViewsPerHour)) : '—'}
              sub={stats.trackingCount > 0 ? 'current rate' : 'lifetime avg'}
            />
            <StatCard
              label="Likes / Hour"
              value={stats.avgLikesPerHour > 0 ? formatNumber(Math.round(stats.avgLikesPerHour)) : '—'}
              sub={stats.trackingCount > 0 ? 'current rate' : 'lifetime avg'}
            />
          </div>
        )}

        {/* Metric toggle */}
        <div className="flex gap-px bg-[#111214] rounded-lg p-1 border border-[#1a1c20] w-fit">
          {(['views', 'likes', 'retweets', 'replies'] as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMetric(m)}
              className={`px-4 py-1.5 text-xs rounded-md font-semibold transition-all ${
                selectedMetric === m ? 'bg-[#1d9bf0] text-white' : 'text-[#5c6370] hover:text-white'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {/* Chart — shows all posts, selected one isolated (highlighted) */}
        <div className="bg-[#111214] rounded-xl border border-[#1a1c20] p-5">
          <TrajectoryChart
            posts={posts}
            metric={selectedMetric}
            historicalAverage={historicalAverage}
            isolatedIds={isolatedIds}
            onToggleIsolate={handleToggleIsolate}
          />
        </div>

        {/* Post leaderboard */}
        <div className="bg-[#111214] rounded-xl border border-[#1a1c20] p-5">
          <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold mb-3">
            All Tracked Posts
          </div>
          <div className="space-y-1">
            {posts
              .map(post => {
                const metrics = extractMetrics(post);
                if (metrics.length === 0) return null;
                const latest = metrics[metrics.length - 1];
                let viewsPerHour = 0;
                if (metrics.length >= 2) {
                  if (post['Status'] === 'tracking') {
                    const prev = metrics[metrics.length - 2];
                    const gap = (latest.minutes - prev.minutes) / 60;
                    if (gap > 0) viewsPerHour = (latest.views - prev.views) / gap;
                  } else {
                    const first = metrics[0];
                    const total = (latest.minutes - first.minutes) / 60;
                    if (total > 0) viewsPerHour = (latest.views - first.views) / total;
                  }
                }
                const engRate = latest.views > 0
                  ? ((latest.likes + latest.retweets + latest.replies) / latest.views) * 100 : 0;
                return { post, latest, viewsPerHour, engRate, isTracking: post['Status'] === 'tracking' };
              })
              .filter((v): v is NonNullable<typeof v> => v !== null)
              .sort((a, b) => b.latest.views - a.latest.views)
              .map((item, i) => {
                const isIsolated = isolatedIds?.has(item.post['Post ID']);
                const topViews = posts.reduce((max, p) => {
                  const m = extractMetrics(p);
                  return m.length > 0 ? Math.max(max, m[m.length - 1].views) : max;
                }, 0);
                const barW = topViews > 0 ? (item.latest.views / topViews) * 100 : 0;
                return (
                  <button
                    key={item.post['Post ID']}
                    onClick={() => handleToggleIsolate(item.post['Post ID'])}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left ${
                      isIsolated ? 'bg-white/5 border border-[#2a2d32]' : 'hover:bg-[#0d0e10] border border-transparent'
                    }`}
                  >
                    <span className="text-[10px] text-[#5c6370] font-mono w-5 shrink-0">{i + 1}</span>
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <span className={`text-xs font-medium truncate ${isIsolated ? 'text-white' : 'text-[#8b9199]'}`}>
                        @{item.post['Account Handle']}
                      </span>
                      {item.isTracking && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00ba7c] animate-pulse shrink-0" />
                      )}
                    </div>
                    <div className="flex-1 h-1.5 bg-[#1a1c20] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#1d9bf0] transition-all"
                        style={{ width: `${barW}%`, opacity: isIsolated ? 0.8 : 0.4 }}
                      />
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right w-16">
                        <div className="text-xs font-bold font-mono tabular-nums text-white">{formatNumber(item.latest.views)}</div>
                        <div className="text-[9px] text-[#3a3d42]">views</div>
                      </div>
                      <div className="text-right w-12">
                        <div className="text-[10px] font-bold font-mono tabular-nums text-[#8b9199]">{formatNumber(item.latest.likes)}</div>
                        <div className="text-[9px] text-[#3a3d42]">likes</div>
                      </div>
                      <div className="text-right w-14">
                        <div className="text-[10px] font-mono tabular-nums text-[#5c6370]">{(item.engRate ?? 0).toFixed(2)}%</div>
                        <div className="text-[9px] text-[#3a3d42]">eng</div>
                      </div>
                      <div className="text-right w-16">
                        <div className="text-[10px] font-mono tabular-nums text-[#1d9bf0]">{formatNumber(Math.round(item.viewsPerHour))}/hr</div>
                        <div className="text-[9px] text-[#3a3d42]">velocity</div>
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[10px] text-[#2a2d32]">Shown Media Launch Tracker</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#111214] rounded-xl border border-[#1a1c20] px-4 py-3">
      <p className="text-[9px] text-[#5c6370] uppercase tracking-wider font-semibold mb-0.5">{label}</p>
      <p className="text-lg font-bold font-mono tabular-nums text-white">{value}</p>
      {sub && <p className="text-[9px] text-[#3a3d42]">{sub}</p>}
    </div>
  );
}
