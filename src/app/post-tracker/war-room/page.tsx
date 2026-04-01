'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { usePostTracker } from '../context';
import TrajectoryChart, { projectTrend, projectEngagementLog } from '@/components/post-tracker/TrajectoryChart';
import { extractMetrics, formatNumber, addPTPost, median, fetchPostReplies, fetchQuoteTweets } from '@/lib/post-tracker-api';
import type { PostReply, RepliesResponse, QuoteTweet, QuoteTweetsResponse } from '@/lib/post-tracker-api';

type Metric = 'views' | 'likes' | 'retweets' | 'replies';

// ---------------------------------------------------------------------------
// Sentiment helpers (client-side, no API)
// ---------------------------------------------------------------------------
const POSITIVE_WORDS = new Set([
  'great', 'love', 'amazing', 'awesome', 'good', 'excellent', 'fantastic', 'wonderful',
  'best', 'perfect', 'incredible', 'wow', 'nice', 'beautiful', 'brilliant', 'happy',
  'excited', 'congrats', 'congratulations', 'thank', 'thanks', 'agree', 'absolutely',
  'true', 'exactly', 'right', 'correct', 'fire', 'lit', 'goat', 'legend', 'banger',
  'based', 'clean', 'solid', 'facts', 'real', 'dope', 'sick', 'legendary', 'inspiring',
  'genius', 'iconic', 'respect', 'proud', 'blessed', 'winning', 'win', 'helpful',
  'smart', 'clever', 'powerful', 'insightful', 'quality', 'underrated', 'accurate',
]);
const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'stupid', 'trash', 'garbage',
  'scam', 'fake', 'lie', 'lies', 'wrong', 'false', 'never', 'stop', 'spam', 'bot',
  'fraud', 'boring', 'useless', 'waste', 'cringe', 'mid', 'cap', 'clown', 'brainwashed',
  'idiot', 'dumb', 'pathetic', 'disgusting', 'gross', 'fail', 'failed', 'loser',
  'disagree', 'misleading', 'dangerous', 'toxic', 'negative', 'overrated', 'liar',
]);

function computeSentiment(replies: PostReply[]): number {
  if (replies.length === 0) return 50;
  let pos = 0, neg = 0;
  for (const r of replies) {
    const words = r.text.toLowerCase().split(/[\s\W]+/);
    for (const w of words) {
      if (POSITIVE_WORDS.has(w)) pos++;
      if (NEGATIVE_WORDS.has(w)) neg++;
    }
  }
  const total = pos + neg;
  if (total === 0) return 50;
  return Math.round((pos / total) * 100);
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'that', 'this',
  'and', 'or', 'but', 'i', 'you', 'we', 'they', 'it', 'he', 'she', 'my', 'your',
  'our', 'their', 'me', 'him', 'her', 'us', 'them', 'what', 'which', 'who', 'how',
  'when', 'where', 'why', 'with', 'for', 'on', 'at', 'by', 'from', 'as', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can',
  'could', 'should', 'may', 'might', 'must', 'am', 'not', 'no', 'so', 'if', 'about',
  'up', 'out', 'just', 'like', 'also', 'more', 'all', 'get', 'got', 'its', 'rt',
  'im', 'ive', 'dont', 'doesnt', 'isnt', 'wasnt', 'wont', 'cant', 'via', 'https',
  'http', 'co', 'www', 'amp', 'de', 'en', 'el', 'la', 'los', 'las', 'too', 'then',
  'than', 'been', 'into', 'over', 'after', 'because', 'these', 'those', 'some',
  'here', 'there', 'now', 'very', 'still', 'always', 'never', 'every', 'each',
]);

function computeWordFrequency(replies: PostReply[]): { word: string; count: number }[] {
  const freq: Record<string, number> = {};
  for (const r of replies) {
    const words = r.text.toLowerCase().split(/[\s\W]+/);
    for (const w of words) {
      if (w.length < 3 || STOPWORDS.has(w) || /^\d+$/.test(w)) continue;
      freq[w] = (freq[w] || 0) + 1;
    }
  }
  return Object.entries(freq)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 40);
}

// ---------------------------------------------------------------------------
// SVG gauge helper
// ---------------------------------------------------------------------------
function gaugePoint(cx: number, cy: number, r: number, pct: number) {
  const angle = Math.PI * (1 - pct); // 0%=left(π), 100%=right(0)
  return {
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
  };
}

function gaugeArcPath(cx: number, cy: number, r: number, p1: number, p2: number): string {
  if (p2 <= p1) return '';
  const s = gaugePoint(cx, cy, r, p1);
  const e = gaugePoint(cx, cy, r, p2);
  const span = p2 - p1;
  // Split at midpoint if arc would be ≥180° to avoid SVG ambiguity
  if (span >= 0.999) {
    const m = gaugePoint(cx, cy, r, 0.5);
    return (
      `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 0 1 ${m.x.toFixed(2)} ${m.y.toFixed(2)} ` +
      `A ${r} ${r} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
    );
  }
  const la = span > 0.5 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${la} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function WarRoomPage() {
  const { posts, loading, error, activePosts, completedPosts, loadPosts } = usePostTracker();
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<Metric>('views');
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [shareToast, setShareToast] = useState(false);
  const [warRoomCopied, setWarRoomCopied] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [repliesData, setRepliesData] = useState<RepliesResponse | null>(null);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [quotesData, setQuotesData] = useState<QuoteTweetsResponse | null>(null);
  const [quotesLoading, setQuotesLoading] = useState(false);

  useEffect(() => {
    if (!loading) setLastRefreshed(new Date());
  }, [posts, loading]);

  useEffect(() => {
    if (!selectedPostId && activePosts.length > 0) {
      const sorted = [...activePosts].sort((a, b) =>
        new Date(b['Date Added'] || b['Date Posted']).getTime() - new Date(a['Date Added'] || a['Date Posted']).getTime()
      );
      setSelectedPostId(sorted[0]['Post ID']);
    }
  }, [activePosts, selectedPostId]);

  const loadReplies = useCallback(async (postId: string) => {
    if (!postId) return;
    setRepliesLoading(true);
    try {
      const data = await fetchPostReplies(postId);
      setRepliesData(data);
    } catch (e) {
      console.error('Failed to fetch replies:', e);
      setRepliesData(null);
    } finally {
      setRepliesLoading(false);
    }
  }, []);

  const loadQuotes = useCallback(async (postId: string) => {
    if (!postId) return;
    setQuotesLoading(true);
    try {
      const data = await fetchQuoteTweets(postId);
      setQuotesData(data);
    } catch (e) {
      console.error('Failed to fetch quote tweets:', e);
      setQuotesData(null);
    } finally {
      setQuotesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPostId) {
      setRepliesData(null);
      setQuotesData(null);
    }
  }, [selectedPostId]);

  const selectedPost = posts.find(p => p['Post ID'] === selectedPostId);
  const metrics = selectedPost ? extractMetrics(selectedPost) : [];
  const latestMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const isLive = selectedPost?.['Status'] === 'tracking';

  const hourlyGrowth = useMemo(() => {
    if (!latestMetric) return null;
    // Single data point — project from origin (views/time * 60)
    if (metrics.length < 2) {
      if (latestMetric.minutes <= 0) return null;
      const scale = 60 / latestMetric.minutes;
      return {
        views: Math.round(latestMetric.views * scale),
        likes: Math.round(latestMetric.likes * scale),
        retweets: Math.round(latestMetric.retweets * scale),
        replies: Math.round(latestMetric.replies * scale),
      };
    }
    const lastMin = latestMetric.minutes;
    const targetMin = lastMin - 60;
    let closest = metrics[0];
    for (const m of metrics) {
      if (m.minutes <= targetMin) closest = m;
    }
    if (closest.minutes === lastMin) closest = metrics[metrics.length - 2];
    const gap = lastMin - closest.minutes;
    if (gap <= 0) return null;
    const scale = 60 / gap;
    return {
      views: Math.max(0, Math.round((latestMetric.views - closest.views) * scale)),
      likes: Math.max(0, Math.round((latestMetric.likes - closest.likes) * scale)),
      retweets: Math.max(0, Math.round((latestMetric.retweets - closest.retweets) * scale)),
      replies: Math.max(0, Math.round((latestMetric.replies - closest.replies) * scale)),
    };
  }, [metrics, latestMetric]);

  const avgAtCheckpoint = useMemo(() => {
    if (!latestMetric || completedPosts.length === 0) return null;
    const vals = completedPosts
      .map(p => extractMetrics(p).find(m => m.checkpoint === latestMetric.checkpoint))
      .filter(v => v?.hasData);
    if (vals.length === 0) return null;
    return {
      views: median(vals.map(v => v!.views)),
      likes: median(vals.map(v => v!.likes)),
      retweets: median(vals.map(v => v!.retweets)),
      replies: median(vals.map(v => v!.replies)),
    };
  }, [latestMetric, completedPosts]);

  const velocity = useMemo(() => {
    if (metrics.length < 2) return null;
    const last = metrics[metrics.length - 1];
    const prev = metrics[metrics.length - 2];
    const hoursDiff = (last.minutes - prev.minutes) / 60;
    if (hoursDiff === 0) return null;
    const metricPerHour = (last[selectedMetric] as number - (prev[selectedMetric] as number)) / hoursDiff;
    let prevVelocity = null;
    if (metrics.length >= 3) {
      const prevPrev = metrics[metrics.length - 3];
      const prevHours = (prev.minutes - prevPrev.minutes) / 60;
      if (prevHours > 0) {
        prevVelocity = ((prev[selectedMetric] as number) - (prevPrev[selectedMetric] as number)) / prevHours;
      }
    }
    const engagementRate = last.views > 0
      ? ((last.likes + last.retweets + last.replies) / last.views) * 100 : 0;
    const withData = metrics.filter(m => m.hasData);
    const dataPoints = withData.map(m => ({ minutes: m.minutes, value: m[selectedMetric] as number }));
    const lastMinutes = last.minutes;
    const futureTargets = [1440, 2880].filter(m => m > lastMinutes);
    const projected = futureTargets.length > 0
      ? selectedMetric === 'views'
        ? projectTrend(dataPoints, futureTargets)
        : projectEngagementLog(dataPoints, futureTargets)
      : [];
    const proj24h = projected.find(p => p.minutes === 1440)?.value ?? null;
    const proj48h = projected.find(p => p.minutes === 2880)?.value ?? null;
    return {
      metricPerHour,
      prevVelocity,
      velocityTrend: prevVelocity !== null
        ? (metricPerHour > prevVelocity ? 'up' : metricPerHour < prevVelocity ? 'down' : 'flat')
        : null,
      engagementRate,
      proj24h,
      proj48h,
    };
  }, [metrics, selectedMetric]);

  // Quote tweets already sorted by like_count from the backend
  const topQuotes = quotesData?.quotes ?? [];

  const sentimentScore = useMemo(() => {
    if (!repliesData || repliesData.replies.length === 0) return null;
    const authorHandle = selectedPost?.['Account Handle']?.toLowerCase();
    const replies = repliesData.replies.filter(r => r.author.username.toLowerCase() !== authorHandle);
    return computeSentiment(replies);
  }, [repliesData, selectedPost]);

  const wordFrequencies = useMemo(() => {
    if (!repliesData || repliesData.replies.length === 0) return [];
    const authorHandle = selectedPost?.['Account Handle']?.toLowerCase();
    const replies = repliesData.replies.filter(r => r.author.username.toLowerCase() !== authorHandle);
    return computeWordFrequency(replies);
  }, [repliesData, selectedPost]);

  const viewsPerHour = hourlyGrowth?.views ?? 0;
  // Gauge max = 3× current rate so the needle sits at ~33% at current pace.
  // That leaves room to show acceleration (viral = near 100%) without the
  // needle being stuck near zero from an artificially inflated max.
  const gaugeMax = useMemo(() => {
    if (viewsPerHour > 0) return Math.max(viewsPerHour * 3, 10000);
    return 50000;
  }, [viewsPerHour]);

  async function handleUrlSubmit() {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    try {
      const match = urlInput.match(/status\/(\d+)/);
      if (!match) return;
      const postId = match[1];
      const existing = posts.find(p => p['Post ID'] === postId);
      if (existing) { setSelectedPostId(postId); setUrlInput(''); return; }
      await addPTPost(urlInput);
      await loadPosts();
      setSelectedPostId(postId);
      setUrlInput('');
    } finally {
      setUrlLoading(false);
    }
  }

  function timeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
  }

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      if (a['Status'] === 'tracking' && b['Status'] !== 'tracking') return -1;
      if (b['Status'] === 'tracking' && a['Status'] !== 'tracking') return 1;
      return new Date(b['Date Added'] || b['Date Posted']).getTime() - new Date(a['Date Added'] || a['Date Posted']).getTime();
    });
  }, [posts]);

  const isolatedIds = useMemo(() => {
    if (!selectedPost) return null;
    return new Set([selectedPost['Post ID']]);
  }, [selectedPost]);

  const searchFilteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return sortedPosts;
    const q = searchQuery.toLowerCase();
    return sortedPosts.filter(p =>
      p['Account Handle'].toLowerCase().includes(q) ||
      (p['Campaign'] || '').toLowerCase().includes(q) ||
      p['Post ID'].includes(q)
    );
  }, [sortedPosts, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    }
    if (searchOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1d9bf0] border-t-transparent" />
      </div>
    );
  }
  if (error) {
    return <div className="bg-[#f4212e]/10 border border-[#f4212e]/20 rounded-2xl p-5 text-[#f4212e]">{error}</div>;
  }

  const heroMetrics: { key: Metric; label: string }[] = [
    { key: 'views', label: 'Views' },
    { key: 'likes', label: 'Likes' },
    { key: 'retweets', label: 'Retweets' },
    { key: 'replies', label: 'Replies' },
  ];

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] px-3 py-3 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:flex-wrap sm:gap-3">
        {/* Searchable post selector */}
        <div ref={searchRef} className="relative w-full sm:flex-1 sm:max-w-sm">
          <button
            onClick={() => {
              setSearchOpen(v => !v);
              if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 bg-black/50 border border-[#2a2d32] rounded-lg text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#1d9bf0] hover:border-[#3a3d42] transition-colors text-left"
          >
            <span className="flex-1 truncate">
              {selectedPost
                ? <>{selectedPost['Status'] === 'tracking' && <span className="text-[#00ba7c] mr-1">●</span>}@{selectedPost['Account Handle']} — {selectedPost['Campaign'] || selectedPost['Post ID']}</>
                : <span className="text-[#3a3d42]">Select a post...</span>
              }
            </span>
            <svg className={`w-3.5 h-3.5 text-[#5c6370] shrink-0 transition-transform ${searchOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>

          {searchOpen && (
            <div className="absolute z-50 top-full mt-1 w-full bg-[#111214] border border-[#2a2d32] rounded-lg shadow-xl overflow-hidden">
              <div className="p-2 border-b border-[#1a1c20]">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by handle or campaign..."
                  className="w-full px-2.5 py-1.5 bg-black/50 border border-[#2a2d32] rounded text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#1d9bf0] placeholder-[#3a3d42]"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {searchFilteredPosts.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-[#3a3d42] text-center">No posts found</div>
                ) : (
                  searchFilteredPosts.map((post) => {
                    const tweetUrl = post['Post URL'] || `https://x.com/${post['Account Handle']}/status/${post['Post ID']}`;
                    const isSelected = post['Post ID'] === selectedPostId;
                    return (
                      <div
                        key={post['Post ID']}
                        className={`flex items-center gap-2 px-3 py-2 hover:bg-white/[0.04] transition-colors group ${isSelected ? 'bg-[#1d9bf0]/10' : ''}`}
                      >
                        <button
                          className="flex-1 flex items-center gap-2 text-left min-w-0"
                          onClick={() => {
                            setSelectedPostId(post['Post ID']);
                            setSearchOpen(false);
                            setSearchQuery('');
                          }}
                        >
                          {post['Status'] === 'tracking' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00ba7c] animate-pulse shrink-0" />
                          )}
                          <span className={`text-xs font-mono truncate ${isSelected ? 'text-[#1d9bf0]' : 'text-white'}`}>
                            @{post['Account Handle']}
                            {post['Campaign'] && <span className="text-[#5c6370] ml-1">— {post['Campaign']}</span>}
                          </span>
                        </button>
                        <a
                          href={tweetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 p-1 text-[#3a3d42] hover:text-[#1d9bf0] transition-colors opacity-0 group-hover:opacity-100"
                          title="Open tweet on X"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            placeholder="Paste post URL..."
            className="flex-1 sm:w-64 px-3 py-2 bg-black/50 border border-[#2a2d32] rounded-lg text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-[#1d9bf0] placeholder-[#3a3d42]"
          />
          <button
            onClick={handleUrlSubmit}
            disabled={urlLoading || !urlInput.trim()}
            className="px-3 py-2 bg-[#1d9bf0]/10 border border-[#1d9bf0]/30 rounded-lg text-xs text-[#1d9bf0] font-semibold hover:bg-[#1d9bf0]/20 disabled:opacity-40 transition-colors shrink-0"
          >
            {urlLoading ? '...' : 'Track'}
          </button>
        </div>

        {selectedPost && (
          <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
            {selectedPost['Campaign'] && (
              <button
                onClick={() => {
                  const slug = selectedPost['Campaign'].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                  navigator.clipboard.writeText(`${window.location.origin}/war-room/${slug}`);
                  setWarRoomCopied(true);
                  setTimeout(() => setWarRoomCopied(false), 2000);
                }}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#1d9bf0]/10 text-[#1d9bf0] ring-1 ring-[#1d9bf0]/30 hover:bg-[#1d9bf0]/20 transition-colors"
              >
                {warRoomCopied ? 'Copied!' : 'Share War Room'}
              </button>
            )}
            <button
              onClick={() => {
                const params = new URLSearchParams({ post: selectedPost['Post ID'] });
                if (selectedPost['Campaign']) params.set('campaign', selectedPost['Campaign']);
                params.set('handle', selectedPost['Account Handle']);
                const url = `${window.location.origin}/war-room-share?${params.toString()}`;
                navigator.clipboard.writeText(url);
                setShareToast(true);
                setTimeout(() => setShareToast(false), 2000);
              }}
              className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-[#8b9199] ring-1 ring-white/10 hover:bg-white/10 transition-colors"
            >
              {shareToast ? 'Copied!' : 'Share Post'}
            </button>
            <a
              href={selectedPost['Post URL'] || `https://x.com/${selectedPost['Account Handle']}/status/${selectedPost['Post ID']}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-[#8b9199] ring-1 ring-white/10 hover:text-white hover:bg-white/10 transition-colors"
            >
              View on X &#8599;
            </a>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isLive
                ? 'bg-[#00ba7c]/15 text-[#00ba7c] ring-1 ring-[#00ba7c]/30'
                : 'bg-[#5c6370]/15 text-[#5c6370] ring-1 ring-[#5c6370]/30'
            }`}>
              {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00ba7c] animate-pulse mr-1.5 align-middle" />}
              {isLive ? 'Live' : 'Complete'}
            </span>
            <span className="text-[10px] text-[#3a3d42] font-mono tabular-nums">
              {lastRefreshed.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {!selectedPost ? (
        <div className="flex items-center justify-center h-64 bg-[#0d0e10] rounded-xl border border-[#1a1c20]">
          <p className="text-[#3a3d42] text-sm">Select a post to monitor</p>
        </div>
      ) : (
        <>
          {/* Hero Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {heroMetrics.map(({ key, label }) => {
              const current = latestMetric ? latestMetric[key] as number : 0;
              const growth = hourlyGrowth ? hourlyGrowth[key] : 0;
              return (
                <div key={key} className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] p-3 sm:p-4 text-center">
                  <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold mb-1">{label}</div>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-white font-mono tabular-nums mb-1">
                    {formatNumber(current)}
                  </div>
                  {growth > 0 ? (
                    <span className="text-[10px] sm:text-[11px] font-semibold font-mono text-[#00ba7c]">
                      ▲ +{formatNumber(growth)}/hr
                    </span>
                  ) : (
                    <span className="text-[10px] sm:text-[11px] font-mono text-[#3a3d42]">—</span>
                  )}
                </div>
              );
            })}
            {/* Conversation card */}
            <div className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] p-3 sm:p-4 text-center">
              <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold mb-1">Conversation</div>
              {repliesData ? (
                <>
                  <div className="text-xl md:text-2xl font-bold text-white font-mono tabular-nums mb-1">{repliesData.total}</div>
                  <div className="flex items-center justify-center gap-2">
                    {repliesData.flagged > 0 && <span className="text-[10px] font-semibold text-[#f4212e]">{repliesData.flagged} flagged</span>}
                    {repliesData.questions > 0 && <span className="text-[10px] font-semibold text-[#1d9bf0]">{repliesData.questions} Q</span>}
                    {repliesData.flagged === 0 && repliesData.questions === 0 && <span className="text-[10px] text-[#3a3d42]">replies</span>}
                  </div>
                </>
              ) : (
                <div className="text-sm text-[#3a3d42]">--</div>
              )}
            </div>
            {velocity?.proj24h != null && (
              <div className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] border-dashed p-3 sm:p-4 text-center">
                <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold mb-1">Proj 24h</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-[#8b9199] font-mono tabular-nums mb-1">
                  {formatNumber(velocity.proj24h)}
                </div>
                <span className="text-[10px] text-[#3a3d42]">{selectedMetric}</span>
              </div>
            )}
            {velocity?.proj48h != null && (
              <div className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] border-dashed p-3 sm:p-4 text-center">
                <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold mb-1">Proj 48h</div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-[#8b9199] font-mono tabular-nums mb-1">
                  {formatNumber(velocity.proj48h)}
                </div>
                <span className="text-[10px] text-[#3a3d42]">{selectedMetric}</span>
              </div>
            )}
          </div>

          {/* Trajectory Chart */}
          <div className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] p-3 sm:p-4 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold">
                Trajectory
              </div>
              <div className="flex gap-px bg-black/50 rounded-md p-px border border-[#2a2d32]">
                {(['views', 'likes', 'retweets', 'replies'] as Metric[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMetric(m)}
                    className={`px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] rounded font-medium transition-all ${
                      selectedMetric === m ? 'bg-[#1d9bf0] text-white' : 'text-[#5c6370] hover:text-white'
                    }`}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <TrajectoryChart
              posts={[selectedPost]}
              metric={selectedMetric}
              readOnly={true}
              isolatedIds={isolatedIds}
            />
            <div className="flex items-center flex-wrap gap-x-6 gap-y-2 mt-3 pt-3 border-t border-[#1a1c20]">
              {velocity ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold">Velocity</span>
                    <span className="text-sm font-bold font-mono tabular-nums text-white">
                      {formatNumber(Math.round(velocity.metricPerHour))}/hr
                    </span>
                    {velocity.velocityTrend && (
                      <span className={`text-xs ${
                        velocity.velocityTrend === 'up' ? 'text-[#00ba7c]' : velocity.velocityTrend === 'down' ? 'text-[#f4212e]' : 'text-[#5c6370]'
                      }`}>
                        {velocity.velocityTrend === 'up' ? '▲' : velocity.velocityTrend === 'down' ? '▼' : '—'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold">Engagement</span>
                    <span className="text-sm font-bold font-mono tabular-nums text-white">
                      {(velocity.engagementRate ?? 0).toFixed(1)}%
                    </span>
                  </div>
                  {velocity.proj24h !== null && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold">24h</span>
                      <span className="text-sm font-bold font-mono tabular-nums text-[#8b9199]">{formatNumber(velocity.proj24h)}</span>
                    </div>
                  )}
                  {velocity.proj48h !== null && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold">48h</span>
                      <span className="text-sm font-bold font-mono tabular-nums text-[#8b9199]">{formatNumber(velocity.proj48h)}</span>
                    </div>
                  )}
                </>
              ) : (
                <span className="text-[#3a3d42] text-xs">Waiting for data...</span>
              )}
            </div>
          </div>

          {/* Bottom: Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Left: Top Quote Tweets Leaderboard */}
            <div className="lg:col-span-2 bg-[#0d0e10] rounded-xl border border-[#1a1c20] p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold">
                    Top Quote Tweets
                  </div>
                  {quotesData && (
                    <span className="text-[10px] text-[#3a3d42]">sorted by likes · {quotesData.total} total</span>
                  )}
                </div>
                {quotesData && (
                  <button
                    onClick={() => loadQuotes(selectedPostId)}
                    disabled={quotesLoading}
                    className="text-[10px] text-[#1d9bf0] hover:text-[#1d9bf0]/80 disabled:opacity-40 transition-colors"
                  >
                    {quotesLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                )}
              </div>

              {!quotesData && !quotesLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <p className="text-[#5c6370] text-xs">Who's quote tweeting this post?</p>
                  <button
                    onClick={() => loadQuotes(selectedPostId)}
                    className="px-5 py-2.5 bg-[#1d9bf0]/10 border border-[#1d9bf0]/30 rounded-lg text-sm text-[#1d9bf0] font-semibold hover:bg-[#1d9bf0]/20 transition-colors"
                  >
                    Load Quote Tweets
                  </button>
                </div>
              ) : quotesLoading && !quotesData ? (
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
              {/* Speedometer */}
              <SpeedometerGauge viewsPerHour={viewsPerHour} gaugeMax={gaugeMax} />

              {/* Sentiment Dial */}
              <SentimentDial
                score={sentimentScore}
                repliesLoaded={!!repliesData}
                loading={repliesLoading}
                onLoad={() => loadReplies(selectedPostId)}
              />

              {/* Word Cloud */}
              <WordCloudPanel
                words={wordFrequencies}
                repliesLoaded={!!repliesData}
                loading={repliesLoading}
                onLoad={() => loadReplies(selectedPostId)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quote Tweet Row
// ---------------------------------------------------------------------------
function QuoteTweetRow({ quote, rank, timeAgo }: { quote: QuoteTweet; rank: number; timeAgo: (d: string) => string }) {
  return (
    <a
      href={quote.url || `https://x.com/${quote.author.username}/status/${quote.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2.5 rounded-lg border p-2.5 bg-black/20 border-[#1a1c20] transition-colors hover:border-[#2a2d32] hover:bg-white/[0.02]"
    >
      {/* Rank */}
      <div className="shrink-0 w-5 text-right pt-0.5">
        <span className={`text-[10px] font-bold font-mono tabular-nums ${
          rank === 1 ? 'text-[#f5c518]' : rank <= 3 ? 'text-[#8b9199]' : 'text-[#3a3d42]'
        }`}>
          {rank}
        </span>
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-xs font-semibold text-white truncate max-w-[120px]">{quote.author.name}</span>
          <span className="text-[10px] text-[#5c6370] font-mono">@{quote.author.username}</span>
          <span className="flex items-center gap-2 ml-auto shrink-0">
            {quote.like_count > 0 && (
              <span className="text-[10px] text-[#f59e0b] font-mono font-semibold">
                ♥ {formatNumber(quote.like_count)}
              </span>
            )}
            {quote.retweet_count > 0 && (
              <span className="text-[10px] text-[#00ba7c] font-mono">
                ↻ {formatNumber(quote.retweet_count)}
              </span>
            )}
            {quote.author.followers_count > 0 && (
              <span className="text-[10px] text-[#1d9bf0] font-mono hidden sm:inline">
                {formatNumber(quote.author.followers_count)} followers
              </span>
            )}
          </span>
        </div>
        <p className="text-[11px] text-[#8b9199] leading-relaxed line-clamp-2">{quote.text}</p>
        <span className="text-[9px] text-[#3a3d42] font-mono">
          {quote.created_at ? timeAgo(quote.created_at) : ''}
        </span>
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

  // Zone boundaries: yellow 0-33%, green 33-66%, red 66-100%
  let statusColor = '#f59e0b';
  let statusLabel = 'OK';
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
        {/* Background track */}
        <path d={gaugeArcPath(cx, cy, r, 0, 1)} fill="none" stroke="#1e2028" strokeWidth="12" strokeLinecap="round" />
        {pct > 0.001 && (
          <path d={gaugeArcPath(cx, cy, r, 0, pct)} fill="none" stroke="url(#speedGrad)" strokeWidth="12" strokeLinecap="round" />
        )}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={needlePt.x} y2={needlePt.y} stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        <circle cx={cx} cy={cy} r="4" fill="#2a2d32" stroke="white" strokeWidth="1.5" />
        <text x={cx} y={cy + 14} textAnchor="middle" fill="white" fontSize="13" fontFamily="monospace" fontWeight="bold">
          {formatNumber(Math.round(viewsPerHour))}/hr
        </text>
        <text x={cx} y={cy + 25} textAnchor="middle" fill={statusColor} fontSize="8" fontFamily="sans-serif" fontWeight="bold" letterSpacing="2">
          {statusLabel}
        </text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sentiment Dial
// ---------------------------------------------------------------------------
function SentimentDial({
  score,
  repliesLoaded,
  loading,
  onLoad,
}: {
  score: number | null;
  repliesLoaded: boolean;
  loading: boolean;
  onLoad: () => void;
}) {
  const cx = 100, cy = 90, r = 72;
  const pct = score !== null ? score / 100 : 0;

  // Zones: red (0-40%), yellow (40-70%), green (70-100%)
  let statusColor = '#f4212e';
  let statusLabel = 'Negative';
  if (score !== null) {
    if (score >= 70) { statusColor = '#00ba7c'; statusLabel = 'Positive'; }
    else if (score >= 40) { statusColor = '#f59e0b'; statusLabel = 'Mixed'; }
  }

  const needlePt = gaugePoint(cx, cy, r * 0.85, pct);

  return (
    <div className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] p-3 sm:p-4">
      <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold mb-1">Sentiment Score</div>
      {!repliesLoaded && !loading ? (
        <div className="flex items-center justify-center py-6">
          <button onClick={onLoad} className="text-xs text-[#5c6370] hover:text-[#1d9bf0] transition-colors">
            Load to see sentiment
          </button>
        </div>
      ) : loading && !repliesLoaded ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#1d9bf0] border-t-transparent" />
        </div>
      ) : (
        <svg viewBox="0 0 200 105" className="w-full">
          {/* Background track */}
          <path d={gaugeArcPath(cx, cy, r, 0, 1)} fill="none" stroke="#1a1c20" strokeWidth="14" strokeLinecap="round" />
          {/* Zone colors (dim) */}
          <path d={gaugeArcPath(cx, cy, r, 0, 0.4)} fill="none" stroke="#f4212e" strokeWidth="12" strokeLinecap="round" opacity="0.25" />
          <path d={gaugeArcPath(cx, cy, r, 0.4, 0.7)} fill="none" stroke="#f59e0b" strokeWidth="12" strokeLinecap="round" opacity="0.25" />
          <path d={gaugeArcPath(cx, cy, r, 0.7, 1)} fill="none" stroke="#00ba7c" strokeWidth="12" strokeLinecap="round" opacity="0.25" />
          {/* Active fill */}
          {score !== null && pct > 0.001 && (
            <path d={gaugeArcPath(cx, cy, r, 0, pct)} fill="none" stroke={statusColor} strokeWidth="12" strokeLinecap="round" />
          )}
          {/* Needle */}
          {score !== null && (
            <line x1={cx} y1={cy} x2={needlePt.x} y2={needlePt.y} stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
          )}
          <circle cx={cx} cy={cy} r="4" fill="#2a2d32" stroke="white" strokeWidth="1.5" />
          <text x={cx} y={cy + 14} textAnchor="middle" fill="white" fontSize="16" fontFamily="monospace" fontWeight="bold">
            {score !== null ? score : '—'}
          </text>
          <text x={cx} y={cy + 26} textAnchor="middle" fill={score !== null ? statusColor : '#3a3d42'} fontSize="8" fontFamily="sans-serif" fontWeight="bold" letterSpacing="2">
            {score !== null ? statusLabel.toUpperCase() : 'NO DATA'}
          </text>
        </svg>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Word Cloud
// ---------------------------------------------------------------------------
function WordCloudPanel({
  words,
  repliesLoaded,
  loading,
  onLoad,
}: {
  words: { word: string; count: number }[];
  repliesLoaded: boolean;
  loading: boolean;
  onLoad: () => void;
}) {
  const maxCount = words.length > 0 ? words[0].count : 1;
  const minCount = words.length > 0 ? words[words.length - 1].count : 1;

  // Color palette for words
  const COLORS = ['#1d9bf0', '#00ba7c', '#f59e0b', '#8b9199', '#c4c8cc', '#e879f9', '#f4212e'];

  function wordSize(count: number): number {
    if (maxCount === minCount) return 13;
    const ratio = (count - minCount) / (maxCount - minCount);
    return Math.round(9 + ratio * 13); // 9px to 22px
  }

  return (
    <div className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] p-3 sm:p-4">
      <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold mb-3">Reply Word Cloud</div>
      {!repliesLoaded && !loading ? (
        <div className="flex items-center justify-center py-6">
          <button onClick={onLoad} className="text-xs text-[#5c6370] hover:text-[#1d9bf0] transition-colors">
            Load to see word cloud
          </button>
        </div>
      ) : loading && !repliesLoaded ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#1d9bf0] border-t-transparent" />
        </div>
      ) : words.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <p className="text-[#3a3d42] text-xs">No words to display</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-2 gap-y-1.5 items-center justify-center py-2 min-h-[100px]">
          {words.map(({ word, count }, idx) => (
            <span
              key={word}
              style={{
                fontSize: `${wordSize(count)}px`,
                color: COLORS[idx % COLORS.length],
                opacity: 0.5 + (count / maxCount) * 0.5,
                fontWeight: count > maxCount * 0.6 ? 700 : count > maxCount * 0.3 ? 600 : 400,
              }}
              className="font-mono leading-tight cursor-default select-none"
              title={`${word} (${count})`}
            >
              {word}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
