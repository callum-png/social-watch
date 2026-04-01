'use client';

import { useState } from 'react';
import { usePostTracker } from '../context';
import TrajectoryChart from '@/components/post-tracker/TrajectoryChart';
import ConfidenceIndicator from '@/components/post-tracker/ConfidenceIndicator';
import { extractMetrics, formatNumber, DISPLAY_CHECKPOINTS, computeHistoricalMedian, median } from '@/lib/post-tracker-api';

type Metric = 'views' | 'likes' | 'retweets' | 'replies';

export default function BenchmarkPage() {
  const { posts, loading, error, completedPosts } = usePostTracker();
  const [selectedMetric, setSelectedMetric] = useState<Metric>('views');
  const [benchmarkPostId, setBenchmarkPostId] = useState<string>('');

  const historicalAverage = computeHistoricalMedian(completedPosts);

  const calculateMedianAtCheckpoint = (checkpoint: string, metric: Metric) => {
    const values = completedPosts
      .map(p => {
        const metrics = extractMetrics(p);
        const cp = metrics.find(m => m.checkpoint === checkpoint);
        return cp ? cp[metric] : null;
      })
      .filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    return median(values);
  };

  const benchmarkPost = posts.find(p => p['Post ID'] === benchmarkPostId);
  const benchmarkMetrics = benchmarkPost ? extractMetrics(benchmarkPost) : [];
  const benchmarkDisplayMetrics = benchmarkMetrics.filter(m =>
    DISPLAY_CHECKPOINTS.some(dc => dc.name === m.checkpoint)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1d9bf0] border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#f4212e]/10 border border-[#f4212e]/20 rounded-2xl p-5 text-[#f4212e]">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-[#111214] rounded-xl border border-[#2a2d32] p-5">
      <h2 className="text-sm font-bold text-white mb-4">Benchmark Comparison</h2>
      <div className="mb-6">
        <label className="block text-sm text-[#8b9199] mb-2">Select a post to benchmark:</label>
        <select
          value={benchmarkPostId}
          onChange={(e) => setBenchmarkPostId(e.target.value)}
          className="w-full max-w-md px-4 py-3 bg-black/50 border border-[#2a2d32] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#1d9bf0]/50 focus:border-[#1d9bf0]/50"
        >
          <option value="">Choose a post...</option>
          {posts.map((post) => (
            <option key={post['Post ID']} value={post['Post ID']}>
              @{post['Account Handle']} - {post['Campaign'] || post['Post ID']}
            </option>
          ))}
        </select>
      </div>
      {benchmarkPost && benchmarkDisplayMetrics.length > 0 ? (
        <div>
          <div className="mb-6 max-w-xs">
            <ConfidenceIndicator post={benchmarkPost} completedPosts={completedPosts} />
          </div>
          <div className="mb-6">
            <TrajectoryChart
              posts={[benchmarkPost]}
              metric={selectedMetric}
              historicalAverage={historicalAverage}
            />
          </div>
          <div className="flex gap-1 bg-black/50 rounded-full p-1 mb-6 w-fit border border-[#2a2d32]">
            {(['views', 'likes', 'retweets', 'replies'] as Metric[]).map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMetric(m)}
                className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all ${
                  selectedMetric === m
                    ? 'bg-[#1d9bf0] text-white shadow-lg shadow-[#1d9bf0]/20'
                    : 'text-[#8b9199] hover:text-white'
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <h3 className="text-sm font-semibold text-[#8b9199] mb-3 uppercase tracking-widest">
            Checkpoint Breakdown
          </h3>
          <div className="grid gap-3">
            {benchmarkDisplayMetrics.map((metric) => {
              const avgViews = calculateMedianAtCheckpoint(metric.checkpoint, 'views');
              const avgLikes = calculateMedianAtCheckpoint(metric.checkpoint, 'likes');
              const diff = avgViews ? ((metric.views - avgViews) / avgViews) * 100 : 0;
              return (
                <div
                  key={metric.checkpoint}
                  className="flex items-center gap-4 p-4 bg-black/30 rounded-xl border border-[#2a2d32] hover:border-[#3a3d42] transition-colors"
                >
                  <div className="w-16 font-mono font-semibold text-sm text-[#1d9bf0]">
                    {metric.displayLabel}
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-[#8b9199] mb-0.5">Views</p>
                      <p className="font-semibold text-white">{formatNumber(metric.views)}</p>
                      {avgViews !== null && (
                        <p className="text-xs text-[#5c6370]">Median: {formatNumber(avgViews)}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-[#8b9199] mb-0.5">Likes</p>
                      <p className="font-semibold text-white">{formatNumber(metric.likes)}</p>
                      {avgLikes !== null && (
                        <p className="text-xs text-[#5c6370]">Median: {formatNumber(avgLikes)}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-[#8b9199] mb-0.5">Replies</p>
                      <p className="font-semibold text-white">{formatNumber(metric.replies)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8b9199] mb-0.5">vs Median</p>
                      <p
                        className={`font-semibold ${
                          diff > 0 ? 'text-[#00ba7c]' : diff < 0 ? 'text-[#f4212e]' : 'text-[#8b9199]'
                        }`}
                      >
                        {diff > 0 ? '+' : ''}
                        {(diff ?? 0).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : benchmarkPostId ? (
        <p className="text-[#8b9199]">No metrics available for this post yet.</p>
      ) : (
        <p className="text-[#8b9199]">Select a post above to see how it compares to the historical median.</p>
      )}
    </div>
  );
}
