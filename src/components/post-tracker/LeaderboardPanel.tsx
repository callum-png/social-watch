'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { PTPost, extractMetrics, formatNumber, CheckpointData } from '@/lib/post-tracker-api';
import { format } from 'date-fns';

type Metric = 'views' | 'likes' | 'retweets' | 'replies';
type TimePeriod = '24h' | '48h' | '7d' | 'all';

interface LeaderboardPanelProps {
  posts: PTPost[];
  metric: Metric;
  onMetricChange: (metric: Metric) => void;
}

interface RankedPost {
  post: PTPost;
  rank: number;
  metricValue: number;
  checkpointLabel: string;
  isPartial: boolean;
  percentOfTop: number;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{ backgroundColor: 'rgba(255,215,0,0.12)', color: '#FFD700', border: '1.5px solid rgba(255,215,0,0.4)' }}>
        1
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{ backgroundColor: 'rgba(192,192,192,0.12)', color: '#C0C0C0', border: '1.5px solid rgba(192,192,192,0.4)' }}>
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{ backgroundColor: 'rgba(205,127,50,0.12)', color: '#CD7F32', border: '1.5px solid rgba(205,127,50,0.4)' }}>
        3
      </div>
    );
  }
  if (rank <= 5) {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-[#1d9bf0]/10 text-[#1d9bf0] border border-[#1d9bf0]/30 shrink-0">
        {rank}
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-[#5c6370] shrink-0">
      {rank}
    </div>
  );
}

function barColor(rank: number): string {
  if (rank === 1) return '#FFD700';
  if (rank === 2) return '#C0C0C0';
  if (rank === 3) return '#CD7F32';
  if (rank <= 5) return '#1d9bf0';
  return '#5c6370';
}

function barOpacity(rank: number): number {
  if (rank <= 3) return 0.8;
  if (rank <= 5) return 0.6;
  return 0.4;
}

function TweetPreview({ postId, visible }: { postId: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute left-0 bottom-full mb-2 z-50 w-[350px] h-[250px] bg-[#111214] rounded-xl border border-[#2a2d32] shadow-2xl shadow-black/80 overflow-hidden pointer-events-none">
      <iframe
        src={`https://platform.twitter.com/embed/Tweet.html?id=${postId}&theme=dark&hideCard=true&hideThread=true`}
        className="w-full pointer-events-none absolute"
        style={{ transform: 'scale(0.82)', transformOrigin: 'top left', width: '122%', height: '400px', top: '-4px', left: '0' }}
        scrolling="no"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}

export default function LeaderboardPanel({ posts, metric, onMetricChange }: LeaderboardPanelProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); };
  }, []);

  function handleMouseEnter(postId: string) {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setHoveredPostId(postId), 400);
  }

  function handleMouseLeave() {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredPostId(null);
  }

  const rankedPosts = useMemo((): RankedPost[] => {
    let postsToRank = posts.filter(p => p['Status'] !== 'error');

    const now = new Date();
    const cutoffHours: Record<TimePeriod, number | null> = {
      '24h': 24,
      '48h': 48,
      '7d': 168,
      'all': null,
    };

    const hours = cutoffHours[timePeriod];
    if (hours !== null) {
      const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
      postsToRank = postsToRank.filter(p => {
        const posted = new Date(p['Date Posted']);
        return posted >= cutoff;
      });
    }

    // For time-windowed filters, cap metrics at the window boundary
    const maxMinutes: Record<TimePeriod, number | null> = {
      '24h': 1440,
      '48h': 2880,
      '7d': null,
      'all': null,
    };
    const cap = maxMinutes[timePeriod];

    const withValues = postsToRank.map(post => {
      const metrics = extractMetrics(post);
      if (metrics.length === 0) return null;

      let chosen: CheckpointData;
      let isPartial = false;

      if (cap !== null) {
        // Find the checkpoint closest to (but not exceeding) the cap
        const withinWindow = metrics.filter(m => m.minutes <= cap);
        if (withinWindow.length === 0) return null;
        chosen = withinWindow[withinWindow.length - 1];
        isPartial = chosen.minutes < cap;
      } else {
        chosen = metrics[metrics.length - 1];
      }

      const value = chosen[metric] as number;
      if (!value || value <= 0) return null;

      return {
        post,
        metricValue: value,
        checkpointLabel: chosen.displayLabel,
        isPartial,
      };
    }).filter((v): v is NonNullable<typeof v> => v !== null);

    withValues.sort((a, b) => b.metricValue - a.metricValue);

    const topValue = withValues[0]?.metricValue || 1;

    return withValues.map((item, index) => ({
      ...item,
      rank: index + 1,
      percentOfTop: (item.metricValue / topValue) * 100,
    }));
  }, [posts, metric, timePeriod]);

  return (
    <div className="bg-[#111214] rounded-xl border border-[#2a2d32] p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="text-sm font-bold text-white">Leaderboard</h2>
        <div className="flex gap-0.5 bg-black/50 rounded-lg p-0.5 border border-[#2a2d32]">
          {(['views', 'likes', 'retweets', 'replies'] as const).map((m) => (
            <button
              key={m}
              onClick={() => onMetricChange(m)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                metric === m ? 'bg-[#1d9bf0] text-white' : 'text-[#5c6370] hover:text-white'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Time period filter */}
      <div className="mb-5">
        <div className="flex gap-0.5 bg-black/50 rounded-lg p-0.5 border border-[#2a2d32] w-fit">
          {([
            { id: 'all' as const, label: 'All-time' },
            { id: '24h' as const, label: '24h' },
            { id: '48h' as const, label: '48h' },
            { id: '7d' as const, label: '7 Days' },
          ]).map((period) => (
            <button
              key={period.id}
              onClick={() => setTimePeriod(period.id)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                timePeriod === period.id
                  ? 'bg-[#1d9bf0] text-white'
                  : 'text-[#5c6370] hover:text-white'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {rankedPosts.length > 0 && (
        <div className="flex flex-wrap gap-3 md:gap-6 mb-5 text-xs text-[#8b9199]">
          <span>{rankedPosts.length} post{rankedPosts.length !== 1 ? 's' : ''} ranked</span>
          <span>Top: <span className="text-white font-medium">@{rankedPosts[0].post['Account Handle']}</span></span>
          <span>Range: <span className="text-white font-medium">{formatNumber(rankedPosts[rankedPosts.length - 1].metricValue)}</span> – <span className="text-white font-medium">{formatNumber(rankedPosts[0].metricValue)}</span></span>
        </div>
      )}

      {/* Leaderboard rows */}
      <div className="space-y-2">
        {rankedPosts.map((item) => (
          <div
            key={item.post['Post ID']}
            onClick={() => window.open(item.post['Post URL'], '_blank', 'noopener,noreferrer')}
            onMouseEnter={() => handleMouseEnter(item.post['Post ID'])}
            onMouseLeave={handleMouseLeave}
            className="relative flex items-center gap-3 p-3 bg-black/30 rounded-xl border border-[#2a2d32] hover:border-[#3a3d42] hover:bg-[#161819] transition-colors cursor-pointer"
          >
            <TweetPreview postId={item.post['Post ID']} visible={hoveredPostId === item.post['Post ID']} />

            <RankBadge rank={item.rank} />

            {/* Profile pic */}
            <img
              src={`https://unavatar.io/twitter/${item.post['Account Handle']}`}
              alt={item.post['Account Handle']}
              className="w-8 h-8 rounded-full border border-[#2a2d32] shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />

            {/* Post info */}
            <div className="min-w-0 shrink-0 w-[100px] sm:w-[160px]">
              <span className="text-xs font-semibold text-white group-hover:text-[#1d9bf0] transition-colors truncate block">
                @{item.post['Account Handle']}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {item.post['Date Posted'] && (
                  <span className="text-[10px] text-[#5c6370]">
                    {format(new Date(item.post['Date Posted']), 'MMM d')}
                  </span>
                )}
                {item.post['Campaign'] && (
                  <span className="text-[10px] text-[#7856ff] font-medium">#{item.post['Campaign']}</span>
                )}
                <span className={`px-1.5 py-0.5 text-[9px] rounded-full font-semibold ${
                  item.post['Status'] === 'tracking'
                    ? 'bg-[#1d9bf0]/10 text-[#1d9bf0]'
                    : 'bg-[#00ba7c]/10 text-[#00ba7c]'
                }`}>
                  {item.post['Status']}
                </span>
              </div>
            </div>

            {/* Metric bar */}
            <div className="flex-1 mx-3">
              <div className="h-2 bg-[#1a1c20] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${item.percentOfTop}%`,
                    backgroundColor: barColor(item.rank),
                    opacity: barOpacity(item.rank),
                  }}
                />
              </div>
            </div>

            {/* Metric value */}
            <div className="text-right shrink-0 w-[50px] sm:w-[70px]">
              <p className="text-sm font-bold text-white">{formatNumber(item.metricValue)}</p>
              <p className="text-[10px] text-[#5c6370]">at {item.checkpointLabel}</p>
            </div>

            {/* Partial indicator */}
            {item.isPartial && (
              <span className="text-[9px] text-[#f0a020] bg-[#f0a020]/10 border border-[#f0a020]/20 px-1.5 py-0.5 rounded font-medium shrink-0">
                partial
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Empty state */}
      {rankedPosts.length === 0 && (
        <div className="text-center py-16">
          <div className="text-[#5c6370] text-sm mb-2">No posts to rank for this time period</div>
          <p className="text-[#3a3d42] text-xs">
            {timePeriod === '7d'
              ? 'No posts were posted in the last 7 days'
              : timePeriod === '24h'
              ? 'No posts were posted in the last 24 hours'
              : timePeriod === '48h'
              ? 'No posts were posted in the last 48 hours'
              : 'Track some posts to see the leaderboard'}
          </p>
        </div>
      )}
    </div>
  );
}
