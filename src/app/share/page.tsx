'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import TrajectoryChart from '@/components/post-tracker/TrajectoryChart';
import { PTPost, extractMetrics, computeHistoricalMedian } from '@/lib/post-tracker-api';

type Metric = 'views' | 'likes' | 'retweets' | 'replies';

const VALID_METRICS: Metric[] = ['views', 'likes', 'retweets', 'replies'];

function ShareContent() {
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<PTPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ids = searchParams.get('p') || '';
  const metricParam = searchParams.get('metric') || 'views';
  const metric: Metric = VALID_METRICS.includes(metricParam as Metric) ? (metricParam as Metric) : 'views';

  useEffect(() => {
    if (!ids) {
      setError('No posts specified');
      setLoading(false);
      return;
    }

    fetch(`/api/share/posts?ids=${encodeURIComponent(ids)}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load posts');
        return res.json();
      })
      .then(data => {
        if (!data.posts || data.posts.length === 0) {
          setError('No posts found');
        } else {
          setPosts(data.posts);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load shared view');
        setLoading(false);
      });
  }, [ids]);

  const historicalAverage = useMemo(() => {
    const completed = posts.filter(p => p['Status'] === 'complete');
    if (completed.length === 0) return undefined;
    const result = computeHistoricalMedian(completed);
    return result.length > 0 ? result : undefined;
  }, [posts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1d9bf0] border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="bg-[#111214] rounded-xl border border-[#2a2d32] p-8 text-center max-w-md">
          <p className="text-[#5c6370] text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="bg-[#111214] rounded-xl border border-[#2a2d32] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-bold text-white">Post Tracker</h1>
              <span className="text-[10px] text-[#5c6370] bg-black/50 px-2 py-0.5 rounded-full border border-[#2a2d32]">
                Shared View
              </span>
            </div>
            <div className="text-xs text-[#5c6370]">
              {posts.length} post{posts.length !== 1 ? 's' : ''} &middot; {metric.charAt(0).toUpperCase() + metric.slice(1)}
            </div>
          </div>
          <TrajectoryChart
            posts={posts}
            metric={metric}
            historicalAverage={historicalAverage}
            readOnly
          />
        </div>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1d9bf0] border-t-transparent"></div>
      </div>
    }>
      <ShareContent />
    </Suspense>
  );
}
