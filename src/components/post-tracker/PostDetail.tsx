'use client';

import { useState } from 'react';
import { PTPost, extractMetrics, formatNumber, DISPLAY_CHECKPOINTS, CheckpointData, median } from '@/lib/post-tracker-api';
import TrajectoryChart from './TrajectoryChart';
import ConfidenceIndicator from './ConfidenceIndicator';
import { format } from 'date-fns';

type Metric = 'views' | 'likes' | 'retweets' | 'replies';

interface PostDetailProps {
  post: PTPost;
  completedPosts: PTPost[];
  historicalAverage: CheckpointData[];
  onBack: () => void;
}

export default function PostDetail({ post, completedPosts, historicalAverage, onBack }: PostDetailProps) {
  const [selectedMetric, setSelectedMetric] = useState<Metric>('views');
  const metrics = extractMetrics(post);
  const latestMetrics = metrics[metrics.length - 1];
  const isTracking = post['Status'] === 'tracking';
  const profileImgUrl = `https://unavatar.io/twitter/${post['Account Handle']}`;
  const displayMetrics = metrics.filter(m => DISPLAY_CHECKPOINTS.some(dc => dc.name === m.checkpoint));

  const calculateMedianAtCheckpoint = (checkpoint: string, metric: Metric) => {
    const values = completedPosts.map(p => { const m = extractMetrics(p); const cp = m.find(x => x.checkpoint === checkpoint); return cp ? cp[metric] : null; }).filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    return median(values);
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-[#8b9199] hover:text-white transition-colors mb-6 group">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
        <span className="text-sm font-medium">Back to Active Posts</span>
      </button>

      <div className="bg-[#111214] rounded-2xl border border-[#2a2d32] overflow-hidden mb-6">
        <div className="relative bg-black border-b border-[#2a2d32] h-[180px] overflow-hidden">
          <iframe src={`https://platform.twitter.com/embed/Tweet.html?id=${post['Post ID']}&theme=dark&hideCard=true&hideThread=true`} className="w-full pointer-events-none absolute" style={{ transform: 'scale(0.85)', transformOrigin: 'top left', width: '118%', height: '350px', top: '-8px', left: '0', overflow: 'hidden' }} scrolling="no" loading="lazy" sandbox="allow-scripts allow-same-origin" />
          <span className={`absolute top-3 right-3 px-3 py-1 text-xs rounded-full font-semibold z-10 flex items-center shadow-lg ${isTracking ? 'bg-[#1d9bf0] text-white shadow-[#1d9bf0]/30' : post['Status'] === 'complete' ? 'bg-[#00ba7c] text-white shadow-[#00ba7c]/30' : 'bg-[#f4212e] text-white shadow-[#f4212e]/30'}`}>
            {isTracking && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#f4212e] mr-1.5 animate-pulse"></span>}
            {post['Status']}
          </span>
        </div>

        <div className="px-6 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <img src={profileImgUrl} alt={post['Account Handle']} className="w-10 h-10 rounded-full border border-[#2a2d32]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div>
                <a href={post['Post URL']} target="_blank" rel="noopener noreferrer" className="font-bold text-white text-base hover:text-[#1d9bf0] transition-colors">@{post['Account Handle']}</a>
                <div className="flex items-center gap-3 mt-0.5">
                  {post['Date Posted'] && <p className="text-xs text-[#8b9199]">Posted {format(new Date(post['Date Posted']), 'MMM d, yyyy · h:mm a')}</p>}
                  {post['Date Added'] && <p className="text-xs text-[#5c6370]">Tracking since {format(new Date(post['Date Added']), 'MMM d, h:mm a')}</p>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:ml-auto">
              {post['Campaign'] && <span className="text-xs text-[#7856ff] font-semibold bg-[#7856ff]/10 px-3 py-1 rounded-full border border-[#7856ff]/20">#{post['Campaign']}</span>}
              <a href={post['Post URL']} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-[#8b9199] hover:text-[#1d9bf0] transition-colors px-3 py-1.5 rounded-full border border-[#2a2d32] hover:border-[#1d9bf0]/30 hover:bg-[#1d9bf0]/5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                View on X
              </a>
            </div>
          </div>
          {latestMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-5 pt-5 border-t border-[#2a2d32]">
              {(['views', 'likes', 'retweets', 'replies'] as const).map((m) => (
                <div key={m} className="bg-black/30 rounded-xl p-4 border border-[#2a2d32]">
                  <p className="text-xs text-[#8b9199] uppercase tracking-widest font-medium mb-1">{m}</p>
                  <p className="text-lg md:text-2xl font-bold text-white">{formatNumber(latestMetrics[m])}</p>
                </div>
              ))}
            </div>
          )}
          <div className="max-w-xs mt-4"><ConfidenceIndicator post={post} completedPosts={completedPosts} /></div>
        </div>
      </div>

      <div className="bg-[#111214] rounded-2xl border border-[#2a2d32] p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-white">Performance Trajectory</h2>
          <div className="flex gap-1 bg-black/50 rounded-full p-1 border border-[#2a2d32]">
            {(['views', 'likes', 'retweets', 'replies'] as Metric[]).map((m) => (
              <button key={m} onClick={() => setSelectedMetric(m)} className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all ${selectedMetric === m ? 'bg-[#1d9bf0] text-white shadow-lg shadow-[#1d9bf0]/20' : 'text-[#8b9199] hover:text-white'}`}>{m.charAt(0).toUpperCase() + m.slice(1)}</button>
            ))}
          </div>
        </div>
        <TrajectoryChart posts={[post]} metric={selectedMetric} historicalAverage={historicalAverage} />
      </div>

      {displayMetrics.length > 0 && (
        <div className="bg-[#111214] rounded-2xl border border-[#2a2d32] p-6">
          <h2 className="text-lg font-bold text-white mb-5">Checkpoint Breakdown</h2>
          <div className="grid gap-3">
            {displayMetrics.map((metric) => {
              const avgViews = calculateMedianAtCheckpoint(metric.checkpoint, 'views');
              const avgLikes = calculateMedianAtCheckpoint(metric.checkpoint, 'likes');
              const diff = avgViews ? ((metric.views - avgViews) / avgViews * 100) : 0;
              return (
                <div key={metric.checkpoint} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 md:p-4 bg-black/30 rounded-xl border border-[#2a2d32] hover:border-[#3a3d42] transition-colors">
                  <div className="w-16 font-mono font-semibold text-sm text-[#1d9bf0]">{metric.displayLabel}</div>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div><p className="text-xs text-[#8b9199] mb-0.5">Views</p><p className="font-semibold text-white">{formatNumber(metric.views)}</p>{avgViews !== null && <p className="text-xs text-[#5c6370]">Median: {formatNumber(avgViews)}</p>}</div>
                    <div><p className="text-xs text-[#8b9199] mb-0.5">Likes</p><p className="font-semibold text-white">{formatNumber(metric.likes)}</p>{avgLikes !== null && <p className="text-xs text-[#5c6370]">Median: {formatNumber(avgLikes)}</p>}</div>
                    <div><p className="text-xs text-[#8b9199] mb-0.5">Retweets</p><p className="font-semibold text-white">{formatNumber(metric.retweets)}</p></div>
                    <div><p className="text-xs text-[#8b9199] mb-0.5">Replies</p><p className="font-semibold text-white">{formatNumber(metric.replies)}</p></div>
                    <div><p className="text-xs text-[#8b9199] mb-0.5">vs Median</p><p className={`font-semibold ${diff > 0 ? 'text-[#00ba7c]' : diff < 0 ? 'text-[#f4212e]' : 'text-[#8b9199]'}`}>{avgViews ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` : '—'}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {post['Last Error'] && (
        <div className="bg-[#f4212e]/10 border border-[#f4212e]/20 rounded-2xl p-4 mt-6">
          <p className="text-xs text-[#f4212e] font-medium">Last Error</p>
          <p className="text-sm text-[#f4212e]/80 mt-1">{post['Last Error']}</p>
        </div>
      )}
    </div>
  );
}
