'use client';

import { useState, useMemo, useEffect, useCallback, use } from 'react';
import TrajectoryChart from '@/components/post-tracker/TrajectoryChart';
import { PTPost, extractMetrics, formatNumber, ALL_CHECKPOINTS, DISPLAY_CHECKPOINTS, CheckpointData } from '@/lib/post-tracker-api';
import type { QuoteTweet, PostReply, RepliesResponse } from '@/lib/post-tracker-api';

type Metric = 'views' | 'likes' | 'retweets' | 'replies';

// ---------------------------------------------------------------------------
// Sentiment helpers
// ---------------------------------------------------------------------------
const POSITIVE_WORDS = new Set(['great','love','amazing','awesome','good','excellent','fantastic','wonderful','best','perfect','incredible','wow','nice','beautiful','brilliant','happy','excited','congrats','congratulations','thank','thanks','agree','absolutely','true','exactly','right','correct','fire','lit','goat','legend','banger','based','clean','solid','facts','real','dope','sick','legendary','inspiring','genius','iconic','respect','proud','blessed','winning','win','helpful','smart','clever','powerful','insightful','quality','underrated','accurate']);
const NEGATIVE_WORDS = new Set(['bad','terrible','awful','hate','worst','horrible','stupid','trash','garbage','scam','fake','lie','lies','wrong','false','never','stop','spam','bot','fraud','boring','useless','waste','cringe','mid','cap','clown','brainwashed','idiot','dumb','pathetic','disgusting','gross','fail','failed','loser','disagree','misleading','dangerous','toxic','negative','overrated','liar']);

function computeSentiment(replies: PostReply[]): number {
  if (replies.length === 0) return 50;
  let pos = 0, neg = 0;
  for (const r of replies) {
    for (const w of r.text.toLowerCase().split(/[\s\W]+/)) {
      if (POSITIVE_WORDS.has(w)) pos++;
      if (NEGATIVE_WORDS.has(w)) neg++;
    }
  }
  const total = pos + neg;
  return total === 0 ? 50 : Math.round((pos / total) * 100);
}

const STOPWORDS = new Set(['the','a','an','is','are','was','were','to','of','in','that','this','and','or','but','i','you','we','they','it','he','she','my','your','our','their','me','him','her','us','them','what','which','who','how','when','where','why','with','for','on','at','by','from','as','be','been','being','have','has','had','do','does','did','will','would','can','could','should','may','might','must','am','not','no','so','if','about','up','out','just','like','also','more','all','get','got','its','rt','im','ive','dont','doesnt','isnt','wasnt','wont','cant','via','https','http','co','www','amp','de','en','el','la','los','las','too','then','than','into','over','after','because','these','those','some','here','there','now','very','still','always','never','every','each']);

function computeWordFrequency(replies: PostReply[]): { word: string; count: number }[] {
  const freq: Record<string, number> = {};
  for (const r of replies) {
    for (const w of r.text.toLowerCase().split(/[\s\W]+/)) {
      if (w.length < 3 || STOPWORDS.has(w) || /^\d+$/.test(w)) continue;
      freq[w] = (freq[w] || 0) + 1;
    }
  }
  return Object.entries(freq).map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count).slice(0, 40);
}

// ---------------------------------------------------------------------------
// SVG gauge helpers
// ---------------------------------------------------------------------------
function gaugePoint(cx: number, cy: number, r: number, pct: number) {
  const angle = Math.PI * (1 - pct);
  return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
}

function gaugeArcPath(cx: number, cy: number, r: number, p1: number, p2: number): string {
  if (p2 <= p1) return '';
  const s = gaugePoint(cx, cy, r, p1);
  const e = gaugePoint(cx, cy, r, p2);
  const span = p2 - p1;
  if (span >= 0.999) {
    const m = gaugePoint(cx, cy, r, 0.5);
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 0 1 ${m.x.toFixed(2)} ${m.y.toFixed(2)} A ${r} ${r} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  }
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${span > 0.5 ? 1 : 0} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function PublicWarRoomPage({ params }: { params: Promise<{ campaign: string }> }) {
  const { campaign } = use(params);
  const [posts, setPosts] = useState<PTPost[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Quote tweets
  const [quotesData, setQuotesData] = useState<{ quotes: QuoteTweet[]; total: number } | null>(null);
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Replies (for sentiment + word cloud)
  const [repliesData, setRepliesData] = useState<RepliesResponse | null>(null);
  const [repliesLoading, setRepliesLoading] = useState(false);

  const fetchData = useCallback(() => {
    fetch(`/api/war-room/${campaign}`)
      .then(res => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Campaign not found' : 'Failed to load');
        return res.json();
      })
      .then(data => {
        setPosts(data.posts || []);
        setCampaignName(data.campaign || campaign);
        setLastRefreshed(new Date());
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [campaign]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const activePosts = posts.filter(p => p['Status'] === 'tracking');
  const completedPosts = posts.filter(p => p['Status'] !== 'tracking');

  useEffect(() => {
    if (!selectedPostId && activePosts.length > 0) {
      const sorted = [...activePosts].sort((a, b) =>
        new Date(b['Date Added'] || b['Date Posted']).getTime() - new Date(a['Date Added'] || a['Date Posted']).getTime()
      );
      setSelectedPostId(sorted[0]['Post ID']);
    } else if (!selectedPostId && posts.length > 0 && activePosts.length === 0) {
      const sorted = [...posts].sort((a, b) =>
        new Date(b['Date Added'] || b['Date Posted']).getTime() - new Date(a['Date Added'] || a['Date Posted']).getTime()
      );
      setSelectedPostId(sorted[0]['Post ID']);
    }
  }, [activePosts, posts, selectedPostId]);

  const loadQuotes = useCallback(async (postId: string) => {
    if (!postId) return;
    setQuotesLoading(true);
    try {
      const res = await fetch(`/api/war-room/post/${postId}/quotes`);
      if (res.ok) setQuotesData(await res.json());
    } catch { /* silent */ } finally { setQuotesLoading(false); }
  }, []);

  const loadReplies = useCallback(async (postId: string) => {
    if (!postId) return;
    setRepliesLoading(true);
    try {
      const res = await fetch(`/api/war-room/post/${postId}/replies`);
      if (res.ok) setRepliesData(await res.json());
    } catch { /* silent */ } finally { setRepliesLoading(false); }
  }, []);

  // Auto-load panels when post is selected
  useEffect(() => {
    if (!selectedPostId) return;
    setQuotesData(null);
    setRepliesData(null);
    loadQuotes(selectedPostId);
    loadReplies(selectedPostId);
  }, [selectedPostId, loadQuotes, loadReplies]);

  const selectedPost = posts.find(p => p['Post ID'] === selectedPostId);
  const metrics = selectedPost ? extractMetrics(selectedPost) : [];
  const latestMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const isLive = selectedPost?.['Status'] === 'tracking';

  const historicalAverage = useMemo(() => {
    return ALL_CHECKPOINTS.map(({ name, minutes }) => {
      if (completedPosts.length === 0) return null;
      const values = completedPosts.map(p => extractMetrics(p).find(m => m.checkpoint === name)).filter(v => v?.hasData);
      if (values.length === 0) return null;
      return {
        checkpoint: name,
        displayLabel: values[0]!.displayLabel,
        minutes,
        views: values.reduce((sum, v) => sum + v!.views, 0) / values.length,
        likes: values.reduce((sum, v) => sum + v!.likes, 0) / values.length,
        retweets: values.reduce((sum, v) => sum + v!.retweets, 0) / values.length,
        replies: values.reduce((sum, v) => sum + v!.replies, 0) / values.length,
        hasData: true,
      };
    }).filter((v): v is CheckpointData => v !== null);
  }, [completedPosts]);

  const trimmedHistoricalAverage = useMemo(() => {
    if (!latestMetric) return historicalAverage;
    const maxMinutes = Math.min(Math.max(latestMetric.minutes * 2.5, 1440), 2880);
    return historicalAverage.filter(h => h.minutes <= maxMinutes);
  }, [historicalAverage, latestMetric]);

  const avgAtCheckpoint = useMemo(() => {
    if (!latestMetric || completedPosts.length === 0) return null;
    const vals = completedPosts.map(p => extractMetrics(p).find(m => m.checkpoint === latestMetric.checkpoint)).filter(v => v?.hasData);
    if (vals.length === 0) return null;
    return {
      views: vals.reduce((s, v) => s + v!.views, 0) / vals.length,
      likes: vals.reduce((s, v) => s + v!.likes, 0) / vals.length,
      retweets: vals.reduce((s, v) => s + v!.retweets, 0) / vals.length,
      replies: vals.reduce((s, v) => s + v!.replies, 0) / vals.length,
    };
  }, [latestMetric, completedPosts]);

  const velocity = useMemo(() => {
    if (metrics.length < 2) return null;
    const last = metrics[metrics.length - 1];
    const prev = metrics[metrics.length - 2];
    const hoursDiff = (last.minutes - prev.minutes) / 60;
    if (hoursDiff === 0) return null;
    const viewsPerHour = (last.views - prev.views) / hoursDiff;
    const likesPerHour = (last.likes - prev.likes) / hoursDiff;
    let prevVelocity = null;
    if (metrics.length >= 3) {
      const prevPrev = metrics[metrics.length - 3];
      const prevHours = (prev.minutes - prevPrev.minutes) / 60;
      if (prevHours > 0) prevVelocity = (prev.views - prevPrev.views) / prevHours;
    }
    const engagementRate = last.views > 0 ? ((last.likes + last.retweets + last.replies) / last.views) * 100 : 0;
    const elapsedHours = last.minutes / 60;
    const overallVelocity = elapsedHours > 0 ? last.views / elapsedHours : 0;
    return {
      viewsPerHour,
      likesPerHour,
      prevVelocity,
      velocityTrend: prevVelocity !== null ? (viewsPerHour > prevVelocity ? 'up' : viewsPerHour < prevVelocity ? 'down' : 'flat') : null,
      engagementRate,
      proj24h: Math.round(last.views + overallVelocity * Math.max(0, 24 - elapsedHours)),
      proj48h: Math.round(last.views + overallVelocity * Math.max(0, 48 - elapsedHours)),
    };
  }, [metrics]);

  // Derived from replies
  const sentimentScore = useMemo(() => {
    if (!repliesData || repliesData.replies.length === 0) return null;
    return computeSentiment(repliesData.replies);
  }, [repliesData]);

  const wordFrequencies = useMemo(() => {
    if (!repliesData || repliesData.replies.length === 0) return [];
    return computeWordFrequency(repliesData.replies);
  }, [repliesData]);

  // Speedometer
  const viewsPerHour = velocity?.viewsPerHour ?? 0;
  const gaugeMax = useMemo(() => {
    if (avgAtCheckpoint && latestMetric && latestMetric.minutes > 0) {
      const medianRate = (avgAtCheckpoint.views / latestMetric.minutes) * 60;
      return Math.max(medianRate * 4, viewsPerHour * 1.5, 10000);
    }
    return Math.max(50000, viewsPerHour * 2, 10000);
  }, [avgAtCheckpoint, latestMetric, viewsPerHour]);

  const topQuotes = quotesData?.quotes ?? [];

  const performance = useMemo(() => {
    if (!latestMetric || completedPosts.length === 0) return null;
    const checkpoint = latestMetric.checkpoint;
    const viewsAtCheckpoint = completedPosts.map(p => {
      const m = extractMetrics(p).find(m => m.checkpoint === checkpoint);
      return m?.hasData ? m.views : null;
    }).filter((v): v is number => v !== null);
    if (viewsAtCheckpoint.length === 0) return null;
    const sorted = [...viewsAtCheckpoint].sort((a, b) => a - b);
    const rank = sorted.filter(v => v <= latestMetric.views).length;
    const avgViews = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const medianViews = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    const milestones = [
      { label: '10K', target: 10000 }, { label: '50K', target: 50000 },
      { label: '100K', target: 100000 }, { label: '250K', target: 250000 },
      { label: '500K', target: 500000 }, { label: '1M', target: 1000000 },
    ].map(({ label, target }) => {
      const hit = metrics.find(m => m.views >= target);
      return { label, target, hit: !!hit, hitAt: hit?.displayLabel || null };
    }).filter(m => m.target <= latestMetric.views * 3);
    return { beating: rank, total: sorted.length + 1, avgViews, medianViews, milestones };
  }, [latestMetric, completedPosts, metrics]);

  const isolatedIds = useMemo(() => {
    if (!selectedPost || !isLive) return null;
    return new Set([selectedPost['Post ID']]);
  }, [selectedPost, isLive]);

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      if (a['Status'] === 'tracking' && b['Status'] !== 'tracking') return -1;
      if (b['Status'] === 'tracking' && a['Status'] !== 'tracking') return 1;
      return new Date(b['Date Added'] || b['Date Posted']).getTime() - new Date(a['Date Added'] || a['Date Posted']).getTime();
    });
  }, [posts]);

  function deltaPercent(current: number, avg: number) {
    if (avg === 0) return { label: '—', color: 'text-[#5c6370]' };
    const pct = ((current - avg) / avg) * 100;
    return { label: `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`, color: pct > 0 ? 'text-[#00ba7c]' : pct < 0 ? 'text-[#f4212e]' : 'text-[#5c6370]' };
  }

  function timeAgo(dateStr: string): string {
    const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const h = Math.floor(diffMin / 60);
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
  }

  const heroMetrics: { key: Metric; label: string }[] = [
    { key: 'views', label: 'Views' }, { key: 'likes', label: 'Likes' },
    { key: 'retweets', label: 'Retweets' }, { key: 'replies', label: 'Replies' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1d9bf0] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="bg-[#111214] border border-[#2a2d32] rounded-2xl p-8 text-center max-w-md">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
            <span className="text-sm font-bold text-[#5c6370]" style={{ fontFamily: 'var(--font-brand)' }}>Shown Media</span>
          </div>
          <p className="text-[#f4212e] text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* Header */}
      <div className="border-b border-[#1a1c20] px-4 sm:px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
            <span className="text-sm font-bold text-[#5c6370] hidden sm:inline" style={{ fontFamily: 'var(--font-brand)' }}>Shown Media</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            {posts.length > 1 && (
              <select
                value={selectedPostId}
                onChange={(e) => setSelectedPostId(e.target.value)}
                className="px-2 sm:px-3 py-1.5 bg-black/50 border border-[#2a2d32] rounded-lg text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#1d9bf0] max-w-[140px] sm:max-w-none"
              >
                {sortedPosts.map((post) => (
                  <option key={post['Post ID']} value={post['Post ID']}>
                    {post['Status'] === 'tracking' ? '[LIVE] ' : ''}@{post['Account Handle']}
                  </option>
                ))}
              </select>
            )}
            <span className="text-sm font-semibold text-white truncate max-w-[120px] sm:max-w-none" style={{ fontFamily: 'var(--font-brand)' }}>
              {campaignName}
            </span>
            {selectedPost && (
              <span className={`px-2 sm:px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                isLive ? 'bg-[#00ba7c]/15 text-[#00ba7c] ring-1 ring-[#00ba7c]/30' : 'bg-[#5c6370]/15 text-[#5c6370] ring-1 ring-[#5c6370]/30'
              }`}>
                {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00ba7c] animate-pulse mr-1.5 align-middle" />}
                {isLive ? 'Live' : 'Complete'}
              </span>
            )}
            <span className="text-[10px] text-[#3a3d42] font-mono tabular-nums hidden sm:inline">{lastRefreshed.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-5 space-y-3 sm:space-y-4">
        {!selectedPost ? (
          <div className="flex items-center justify-center h-64 bg-[#0d0e10] rounded-xl border border-[#1a1c20]">
            <p className="text-[#3a3d42] text-sm">No posts found for this campaign</p>
          </div>
        ) : (
          <>
            {/* Hero Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {heroMetrics.map(({ key, label }) => {
                const current = latestMetric ? latestMetric[key] as number : 0;
                const avg = avgAtCheckpoint ? avgAtCheckpoint[key] : 0;
                const delta = deltaPercent(current, avg);
                const bar = avg > 0 ? Math.min((current / avg) * 100, 200) : 0;
                return (
                  <div key={key} className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] p-4">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold">{label}</span>
                      {latestMetric && <span className="text-[9px] text-[#3a3d42] font-mono">at {latestMetric.displayLabel}</span>}
                    </div>
                    <div className="text-2xl font-bold text-white font-mono tabular-nums mb-1">{formatNumber(current)}</div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold font-mono ${delta.color}`}>{delta.label}</span>
                      <span className="text-[9px] text-[#3a3d42]">vs avg</span>
                    </div>
                    <div className="h-1 bg-[#1a1c20] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(bar, 100)}%`, backgroundColor: bar >= 100 ? '#00ba7c' : bar >= 70 ? '#1d9bf0' : '#f4212e' }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trajectory Chart */}
            <div className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold">Trajectory</div>
              </div>
              <TrajectoryChart posts={[selectedPost]} metric="views" historicalAverage={trimmedHistoricalAverage} readOnly={true} isolatedIds={isolatedIds} />
              {velocity && (
                <div className="flex items-center flex-wrap gap-x-6 gap-y-1 mt-3 pt-3 border-t border-[#1a1c20]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold">Velocity</span>
                    <span className="text-sm font-bold font-mono tabular-nums text-white">{formatNumber(Math.round(velocity.viewsPerHour))}/hr</span>
                    {velocity.velocityTrend && <span className={`text-xs ${velocity.velocityTrend === 'up' ? 'text-[#00ba7c]' : velocity.velocityTrend === 'down' ? 'text-[#f4212e]' : 'text-[#5c6370]'}`}>{velocity.velocityTrend === 'up' ? '▲' : velocity.velocityTrend === 'down' ? '▼' : '—'}</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold">Engagement</span>
                    <span className="text-sm font-bold font-mono tabular-nums text-white">{(velocity.engagementRate ?? 0).toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold">Proj 24h</span>
                    <span className="text-sm font-bold font-mono tabular-nums text-[#8b9199]">{formatNumber(velocity.proj24h)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold">Proj 48h</span>
                    <span className="text-sm font-bold font-mono tabular-nums text-[#8b9199]">{formatNumber(velocity.proj48h)}</span>
                  </div>
                  {performance && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold">Rank</span>
                      <span className="text-sm font-bold font-mono tabular-nums text-white">{performance.beating}/{performance.total}</span>
                      <span className="text-[9px] text-[#3a3d42]">posts beaten</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom: Two-column layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Left: Top Quote Tweets */}
              <div className="md:col-span-2 bg-[#0d0e10] rounded-xl border border-[#1a1c20] p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold">Top Quote Tweets</div>
                    {quotesData && <span className="text-[10px] text-[#3a3d42]">sorted by likes · {quotesData.total} total</span>}
                  </div>
                  {quotesData && (
                    <button onClick={() => loadQuotes(selectedPostId)} disabled={quotesLoading} className="text-[10px] text-[#1d9bf0] hover:text-[#1d9bf0]/80 disabled:opacity-40 transition-colors">
                      {quotesLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                  )}
                </div>

                {(!quotesData && !quotesLoading) || (quotesLoading && !quotesData) ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#1d9bf0] border-t-transparent" />
                  </div>
                ) : topQuotes.length === 0 ? (
                  <div className="flex items-center justify-center py-10">
                    <p className="text-[#3a3d42] text-xs">No quote tweets yet</p>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
                    {topQuotes.map((qt, idx) => (
                      <QuoteTweetRow key={qt.id} quote={qt} rank={idx + 1} timeAgo={timeAgo} />
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Gauges */}
              <div className="space-y-3">
                <SpeedometerGauge viewsPerHour={Math.max(0, viewsPerHour)} gaugeMax={gaugeMax} />
                <SentimentDial score={sentimentScore} repliesLoaded={!!repliesData} loading={repliesLoading} onLoad={() => loadReplies(selectedPostId)} />
                <WordCloudPanel words={wordFrequencies} repliesLoaded={!!repliesData} loading={repliesLoading} onLoad={() => loadReplies(selectedPostId)} />
              </div>
            </div>

            {/* Milestones */}
            {performance && performance.milestones.length > 0 && (
              <div className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] p-3 sm:p-4">
                <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold mb-3">Milestones</div>
                <div className="flex flex-wrap gap-3">
                  {performance.milestones.map((m) => (
                    <div key={m.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${m.hit ? 'border-[#00ba7c]/30 bg-[#00ba7c]/5' : 'border-[#1a1c20]'}`}>
                      <span className={`text-xs font-mono font-semibold ${m.hit ? 'text-white' : 'text-[#3a3d42]'}`}>{m.label}</span>
                      {m.hit && <span className="text-[9px] font-mono text-[#00ba7c]">✓ {m.hitAt}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quote Tweet Row
// ---------------------------------------------------------------------------
function QuoteTweetRow({ quote, rank, timeAgo }: { quote: QuoteTweet; rank: number; timeAgo: (d: string) => string }) {
  return (
    <a href={quote.url || `https://x.com/${quote.author.username}/status/${quote.id}`} target="_blank" rel="noopener noreferrer"
      className="flex items-start gap-2.5 rounded-lg border p-2.5 bg-black/20 border-[#1a1c20] transition-colors hover:border-[#2a2d32] hover:bg-white/[0.02]">
      <div className="shrink-0 w-5 text-right pt-0.5">
        <span className={`text-[10px] font-bold font-mono ${rank === 1 ? 'text-[#f5c518]' : rank <= 3 ? 'text-[#8b9199]' : 'text-[#3a3d42]'}`}>{rank}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-xs font-semibold text-white truncate max-w-[120px]">{quote.author.name}</span>
          <span className="text-[10px] text-[#5c6370] font-mono">@{quote.author.username}</span>
          <span className="flex items-center gap-2 ml-auto shrink-0">
            {quote.like_count > 0 && <span className="text-[10px] text-[#f59e0b] font-mono font-semibold">♥ {formatNumber(quote.like_count)}</span>}
            {quote.retweet_count > 0 && <span className="text-[10px] text-[#00ba7c] font-mono">↻ {formatNumber(quote.retweet_count)}</span>}
            {quote.author.followers_count > 0 && <span className="text-[10px] text-[#1d9bf0] font-mono hidden sm:inline">{formatNumber(quote.author.followers_count)} followers</span>}
          </span>
        </div>
        <p className="text-[11px] text-[#8b9199] leading-relaxed line-clamp-2">{quote.text}</p>
        <span className="text-[9px] text-[#3a3d42] font-mono">{quote.created_at ? timeAgo(quote.created_at) : ''}</span>
      </div>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Speedometer Gauge
// ---------------------------------------------------------------------------
function SpeedometerGauge({ viewsPerHour, gaugeMax }: { viewsPerHour: number; gaugeMax: number }) {
  const cx = 100, cy = 90, r = 72;
  const pct = Math.min(Math.max(viewsPerHour / gaugeMax, 0), 1);
  let statusColor = '#f59e0b', statusLabel = 'OK';
  if (pct >= 0.66) { statusColor = '#f4212e'; statusLabel = 'VIRAL'; }
  else if (pct >= 0.33) { statusColor = '#00ba7c'; statusLabel = 'GOOD'; }
  const needlePt = gaugePoint(cx, cy, r * 0.85, pct);
  return (
    <div className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] p-3 sm:p-4">
      <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold mb-1">Views / Hour</div>
      <svg viewBox="0 0 200 105" className="w-full">
        <defs>
          <linearGradient id="speedGrad" x1={cx - r} y1={cy} x2={cx + r} y2={cy} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#00ba7c" />
            <stop offset="100%" stopColor="#f4212e" />
          </linearGradient>
        </defs>
        <path d={gaugeArcPath(cx, cy, r, 0, 1)} fill="none" stroke="#1e2028" strokeWidth="12" strokeLinecap="round" />
        {pct > 0.001 && <path d={gaugeArcPath(cx, cy, r, 0, pct)} fill="none" stroke="url(#speedGrad)" strokeWidth="12" strokeLinecap="round" />}
        <line x1={cx} y1={cy} x2={needlePt.x} y2={needlePt.y} stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        <circle cx={cx} cy={cy} r="4" fill="#2a2d32" stroke="white" strokeWidth="1.5" />
        <text x={cx} y={cy + 14} textAnchor="middle" fill="white" fontSize="13" fontFamily="monospace" fontWeight="bold">{formatNumber(Math.round(viewsPerHour))}/hr</text>
        <text x={cx} y={cy + 25} textAnchor="middle" fill={statusColor} fontSize="8" fontFamily="sans-serif" fontWeight="bold" letterSpacing="2">{statusLabel}</text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sentiment Dial
// ---------------------------------------------------------------------------
function SentimentDial({ score, repliesLoaded, loading, onLoad }: { score: number | null; repliesLoaded: boolean; loading: boolean; onLoad: () => void }) {
  const cx = 100, cy = 90, r = 72;
  const pct = score !== null ? score / 100 : 0;
  let statusColor = '#f4212e', statusLabel = 'Negative';
  if (score !== null) {
    if (score >= 70) { statusColor = '#00ba7c'; statusLabel = 'Positive'; }
    else if (score >= 40) { statusColor = '#f59e0b'; statusLabel = 'Mixed'; }
  }
  const needlePt = gaugePoint(cx, cy, r * 0.85, pct);
  return (
    <div className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] p-3 sm:p-4">
      <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold mb-1">Sentiment Score</div>
      {!repliesLoaded ? (
        <div className="flex items-center justify-center py-6"><div className="animate-spin rounded-full h-4 w-4 border-2 border-[#1d9bf0] border-t-transparent" /></div>
      ) : (
        <svg viewBox="0 0 200 105" className="w-full">
          <path d={gaugeArcPath(cx, cy, r, 0, 1)} fill="none" stroke="#1a1c20" strokeWidth="14" strokeLinecap="round" />
          <path d={gaugeArcPath(cx, cy, r, 0, 0.4)} fill="none" stroke="#f4212e" strokeWidth="12" strokeLinecap="round" opacity="0.25" />
          <path d={gaugeArcPath(cx, cy, r, 0.4, 0.7)} fill="none" stroke="#f59e0b" strokeWidth="12" strokeLinecap="round" opacity="0.25" />
          <path d={gaugeArcPath(cx, cy, r, 0.7, 1)} fill="none" stroke="#00ba7c" strokeWidth="12" strokeLinecap="round" opacity="0.25" />
          {score !== null && pct > 0.001 && <path d={gaugeArcPath(cx, cy, r, 0, pct)} fill="none" stroke={statusColor} strokeWidth="12" strokeLinecap="round" />}
          {score !== null && <line x1={cx} y1={cy} x2={needlePt.x} y2={needlePt.y} stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />}
          <circle cx={cx} cy={cy} r="4" fill="#2a2d32" stroke="white" strokeWidth="1.5" />
          <text x={cx} y={cy + 14} textAnchor="middle" fill="white" fontSize="16" fontFamily="monospace" fontWeight="bold">{score !== null ? score : '—'}</text>
          <text x={cx} y={cy + 26} textAnchor="middle" fill={score !== null ? statusColor : '#3a3d42'} fontSize="8" fontFamily="sans-serif" fontWeight="bold" letterSpacing="2">{score !== null ? statusLabel.toUpperCase() : 'NO DATA'}</text>
        </svg>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Word Cloud
// ---------------------------------------------------------------------------
function WordCloudPanel({ words, repliesLoaded, loading, onLoad }: { words: { word: string; count: number }[]; repliesLoaded: boolean; loading: boolean; onLoad: () => void }) {
  const maxCount = words.length > 0 ? words[0].count : 1;
  const minCount = words.length > 0 ? words[words.length - 1].count : 1;
  const COLORS = ['#1d9bf0','#00ba7c','#f59e0b','#8b9199','#c4c8cc','#e879f9','#f4212e'];
  function wordSize(count: number): number {
    if (maxCount === minCount) return 13;
    return Math.round(9 + ((count - minCount) / (maxCount - minCount)) * 13);
  }
  return (
    <div className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] p-3 sm:p-4">
      <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold mb-3">Reply Word Cloud</div>
      {!repliesLoaded ? (
        <div className="flex items-center justify-center py-6"><div className="animate-spin rounded-full h-4 w-4 border-2 border-[#1d9bf0] border-t-transparent" /></div>
      ) : words.length === 0 ? (
        <div className="flex items-center justify-center py-6"><p className="text-[#3a3d42] text-xs">No words to display</p></div>
      ) : (
        <div className="flex flex-wrap gap-x-2 gap-y-1.5 items-center justify-center py-2 min-h-[100px]">
          {words.map(({ word, count }, idx) => (
            <span key={word} style={{ fontSize: `${wordSize(count)}px`, color: COLORS[idx % COLORS.length], opacity: 0.5 + (count / maxCount) * 0.5, fontWeight: count > maxCount * 0.6 ? 700 : count > maxCount * 0.3 ? 600 : 400 }}
              className="font-mono leading-tight cursor-default select-none" title={`${word} (${count})`}>
              {word}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
