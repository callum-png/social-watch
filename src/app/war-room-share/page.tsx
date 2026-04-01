'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { PTPost, extractMetrics, formatNumber } from '@/lib/post-tracker-api';
import type { PostReply, RepliesResponse } from '@/lib/post-tracker-api';
import TrajectoryChart from '@/components/post-tracker/TrajectoryChart';

type Metric = 'views' | 'likes' | 'retweets' | 'replies';
type ReplyFilter = 'all' | 'flagged' | 'questions';

function WarRoomShareContent() {
  const searchParams = useSearchParams();
  const postId = searchParams.get('post') || '';

  const [post, setPost] = useState<PTPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMetric, setSelectedMetric] = useState<Metric>('views');
  const [repliesData, setRepliesData] = useState<RepliesResponse | null>(null);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyFilter, setReplyFilter] = useState<ReplyFilter>('all');

  useEffect(() => {
    if (!postId) {
      setError('No post specified');
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`/api/share/posts?ids=${encodeURIComponent(postId)}`).then(r => r.json()),
      fetch(`/api/share/replies?id=${encodeURIComponent(postId)}`).then(r => r.json()).catch(() => null),
    ])
      .then(([postsData, replData]) => {
        if (!postsData.posts || postsData.posts.length === 0) {
          setError('Post not found');
        } else {
          setPost(postsData.posts[0]);
        }
        if (replData && !replData.error) {
          setRepliesData(replData);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load shared view');
        setLoading(false);
      });
  }, [postId]);

  const metrics = post ? extractMetrics(post) : [];
  const latestMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const isLive = post?.['Status'] === 'tracking';

  const isolatedIds = useMemo(() => {
    if (!post) return null;
    return new Set([post['Post ID']]);
  }, [post]);

  // Compute growth in the last ~1 hour for each metric
  const hourlyGrowth = useMemo(() => {
    if (metrics.length < 2 || !latestMetric) return null;
    const lastMin = latestMetric.minutes;
    const targetMin = lastMin - 60;
    let closest = metrics[0];
    for (const m of metrics) {
      if (m.minutes <= targetMin && m.hasData) closest = m;
    }
    if (closest.minutes === lastMin) {
      closest = metrics[metrics.length - 2];
    }
    const gap = lastMin - closest.minutes;
    if (gap <= 0) return null;
    const scale = 60 / gap;
    return {
      views: Math.round((latestMetric.views - closest.views) * scale),
      likes: Math.round((latestMetric.likes - closest.likes) * scale),
      retweets: Math.round((latestMetric.retweets - closest.retweets) * scale),
      replies: Math.round((latestMetric.replies - closest.replies) * scale),
    };
  }, [metrics, latestMetric]);

  const filteredReplies = useMemo(() => {
    if (!repliesData) return [];
    const authorHandle = post?.['Account Handle']?.toLowerCase();
    const nonAuthor = repliesData.replies.filter(r =>
      r.author.username.toLowerCase() !== authorHandle
    );
    switch (replyFilter) {
      case 'flagged': return nonAuthor.filter(r => r.is_flagged);
      case 'questions': return nonAuthor.filter(r => r.is_question);
      default: return nonAuthor;
    }
  }, [repliesData, replyFilter, post]);

  function loadReplies() {
    if (!postId) return;
    setRepliesLoading(true);
    fetch(`/api/share/replies?id=${encodeURIComponent(postId)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) setRepliesData(data);
      })
      .catch(() => {})
      .finally(() => setRepliesLoading(false));
  }

  function timeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1d9bf0] border-t-transparent" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="bg-[#111214] rounded-xl border border-[#2a2d32] p-8 text-center max-w-md">
          <p className="text-[#5c6370] text-sm">{error || 'Post not found'}</p>
        </div>
      </div>
    );
  }

  const heroMetrics: { key: 'views' | 'likes' | 'retweets' | 'replies'; label: string }[] = [
    { key: 'views', label: 'Views' },
    { key: 'likes', label: 'Likes' },
    { key: 'retweets', label: 'Retweets' },
    { key: 'replies', label: 'Replies' },
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-[#0d0e10] rounded-xl border border-[#1a1c20] px-3 sm:px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo.svg" alt="Shown" className="h-5 w-auto shrink-0" />
            <div className="h-4 w-px bg-[#2a2d32] shrink-0" />
            <div className="flex flex-col min-w-0">
              <h1 className="text-sm font-bold text-white truncate">
                {post['Campaign'] || `@${post['Account Handle']}`}
              </h1>
              {post['Campaign'] && (
                <span className="text-[10px] text-[#5c6370]">@{post['Account Handle']}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={post['Post URL'] || `https://x.com/${post['Account Handle']}/status/${post['Post ID']}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-[#8b9199] ring-1 ring-white/10 hover:text-white hover:bg-white/10 transition-colors"
            >
              View on X &#8599;
            </a>
            <a
              href={post['Post URL'] || `https://x.com/${post['Account Handle']}/status/${post['Post ID']}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                isLive
                  ? 'bg-[#00ba7c]/15 text-[#00ba7c] ring-1 ring-[#00ba7c]/30 hover:bg-[#00ba7c]/25'
                  : 'bg-[#5c6370]/15 text-[#5c6370] ring-1 ring-[#5c6370]/30 hover:bg-[#5c6370]/25'
              }`}
            >
              {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00ba7c] animate-pulse mr-1.5 align-middle" />}
              {isLive ? 'Live' : 'Complete'}
            </a>
          </div>
        </div>

        {/* Hero Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
        </div>

        {/* Trajectory Chart */}
        {post && metrics.length > 0 && (
          <div className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] p-3 sm:p-4">
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
              posts={[post]}
              metric={selectedMetric}
              readOnly={true}
              isolatedIds={isolatedIds}
            />
          </div>
        )}

        {/* Conversation summary card */}
        {repliesData && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] p-3 sm:p-4 text-center">
              <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold mb-1">Total Replies</div>
              <div className="text-xl font-bold text-white font-mono tabular-nums">{repliesData.total}</div>
            </div>
            <div className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] p-3 sm:p-4 text-center">
              <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold mb-1">Flagged</div>
              <div className={`text-lg sm:text-xl font-bold font-mono tabular-nums ${repliesData.flagged > 0 ? 'text-[#f4212e]' : 'text-white'}`}>{repliesData.flagged}</div>
            </div>
            <div className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] p-3 sm:p-4 text-center">
              <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold mb-1">Questions</div>
              <div className={`text-lg sm:text-xl font-bold font-mono tabular-nums ${repliesData.questions > 0 ? 'text-[#1d9bf0]' : 'text-white'}`}>{repliesData.questions}</div>
            </div>
          </div>
        )}

        {/* Replies Panel */}
        <div className="bg-[#0d0e10] rounded-xl border border-[#1a1c20] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] text-[#5c6370] uppercase tracking-wider font-semibold">Replies</div>
            {repliesData && (
              <button
                onClick={loadReplies}
                disabled={repliesLoading}
                className="text-[10px] text-[#1d9bf0] hover:text-[#1d9bf0]/80 disabled:opacity-40 transition-colors"
              >
                {repliesLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
          </div>

          {!repliesData && !repliesLoading ? (
            <div className="text-center py-8">
              <button
                onClick={loadReplies}
                className="px-5 py-2.5 bg-[#1d9bf0]/10 border border-[#1d9bf0]/30 rounded-lg text-sm text-[#1d9bf0] font-semibold hover:bg-[#1d9bf0]/20 transition-colors"
              >
                Load Replies
              </button>
            </div>
          ) : repliesLoading && !repliesData ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#1d9bf0] border-t-transparent" />
            </div>
          ) : repliesData && repliesData.total > 0 ? (
            <>
              {/* Filter tabs */}
              <div className="flex items-center gap-1 mb-3">
                {([
                  { key: 'all' as ReplyFilter, label: 'All', count: repliesData.total },
                  { key: 'flagged' as ReplyFilter, label: 'Flagged', count: repliesData.flagged },
                  { key: 'questions' as ReplyFilter, label: 'Questions', count: repliesData.questions },
                ]).map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setReplyFilter(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      replyFilter === key
                        ? key === 'flagged'
                          ? 'bg-[#f4212e]/15 text-[#f4212e] ring-1 ring-[#f4212e]/30'
                          : key === 'questions'
                          ? 'bg-[#1d9bf0]/15 text-[#1d9bf0] ring-1 ring-[#1d9bf0]/30'
                          : 'bg-white/10 text-white ring-1 ring-white/20'
                        : 'text-[#5c6370] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {label}
                    {count > 0 && <span className="ml-1.5 text-[10px] opacity-70">{count}</span>}
                  </button>
                ))}
              </div>

              {/* Reply cards */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredReplies.length === 0 ? (
                  <p className="text-center text-[#3a3d42] text-xs py-4">
                    No {replyFilter === 'flagged' ? 'flagged' : replyFilter === 'questions' ? 'question' : ''} replies
                  </p>
                ) : (
                  filteredReplies.map((reply) => (
                    <ShareReplyCard key={reply.id} reply={reply} timeAgo={timeAgo} />
                  ))
                )}
              </div>
            </>
          ) : repliesData ? (
            <div className="text-center py-8">
              <p className="text-[#3a3d42] text-xs">No replies yet</p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 pt-2 pb-6">
          <img src="/logo.svg" alt="Shown" className="h-3 w-auto opacity-30" />
          <span className="text-[10px] text-[#3a3d42]">Post Tracker</span>
        </div>
      </div>
    </div>
  );
}

function ShareReplyCard({ reply, timeAgo }: { reply: PostReply; timeAgo: (d: string) => string }) {
  const replyUrl = `https://x.com/${reply.author.username}/status/${reply.id}`;
  return (
    <a
      href={replyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-lg border p-3 transition-colors hover:border-[#2a2d32] ${
        reply.is_flagged
          ? 'bg-[#f4212e]/5 border-[#f4212e]/20 hover:bg-[#f4212e]/8'
          : 'bg-black/30 border-[#1a1c20] hover:bg-white/[0.03]'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-white truncate">{reply.author.name}</span>
          <span className="text-[10px] text-[#5c6370] font-mono truncate">@{reply.author.username}</span>
          {reply.author.followers_count > 0 && (
            <span className="text-[10px] text-[#3a3d42] font-mono shrink-0">
              {formatNumber(reply.author.followers_count)} followers
            </span>
          )}
        </div>
        <span className="text-[10px] text-[#3a3d42] font-mono shrink-0 tabular-nums">
          {reply.created_at ? timeAgo(reply.created_at) : ''}
        </span>
      </div>
      <p className="text-xs text-[#c4c8cc] leading-relaxed mb-1.5">{reply.text}</p>
      {(reply.is_flagged || reply.is_question) && (
        <div className="flex items-center gap-1.5">
          {reply.is_flagged && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[#f4212e]/15 text-[#f4212e]">Flagged</span>
          )}
          {reply.is_question && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[#1d9bf0]/15 text-[#1d9bf0]">Question</span>
          )}
          {reply.flag_reasons.length > 0 && (
            <span className="text-[9px] text-[#f4212e]/60 italic truncate">{reply.flag_reasons.slice(0, 3).join(', ')}</span>
          )}
        </div>
      )}
    </a>
  );
}

export default function WarRoomSharePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1d9bf0] border-t-transparent" />
      </div>
    }>
      <WarRoomShareContent />
    </Suspense>
  );
}
