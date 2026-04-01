'use client';

import { PTPost, extractMetrics, median } from '@/lib/post-tracker-api';

interface ConfidenceIndicatorProps {
  post: PTPost;
  completedPosts: PTPost[];
  metric?: 'views' | 'likes';
}

interface ConfidenceResult {
  percentDiff: number;
  postValue: number;
  avgValue: number;
  displayLabel: string;
  status: 'outperforming' | 'on-track' | 'underperforming';
}

function computeConfidence(post: PTPost, completedPosts: PTPost[], metric: 'views' | 'likes'): ConfidenceResult | null {
  const postMetrics = extractMetrics(post);
  if (postMetrics.length === 0) return null;
  const latestCheckpoint = postMetrics[postMetrics.length - 1];
  const avgValues = completedPosts
    .map(p => { const m = extractMetrics(p); const match = m.find(x => x.checkpoint === latestCheckpoint.checkpoint); return match ? match[metric] : null; })
    .filter((v): v is number => v !== null && v > 0);
  if (avgValues.length === 0) return null;
  const avg = median(avgValues);
  const postValue = latestCheckpoint[metric];
  const percentDiff = ((postValue - avg) / avg) * 100;
  return { percentDiff, postValue, avgValue: avg, displayLabel: latestCheckpoint.displayLabel, status: percentDiff > 20 ? 'outperforming' : percentDiff < -20 ? 'underperforming' : 'on-track' };
}

export default function ConfidenceIndicator({ post, completedPosts, metric = 'views' }: ConfidenceIndicatorProps) {
  const confidence = computeConfidence(post, completedPosts, metric);
  if (!confidence) return null;

  const { status, percentDiff, displayLabel } = confidence;
  const config = {
    outperforming: { bg: 'bg-[#00ba7c]/10', border: 'border-[#00ba7c]/20', text: 'text-[#00ba7c]', arrow: '\u2191' },
    'on-track': { bg: 'bg-[#1d9bf0]/10', border: 'border-[#1d9bf0]/20', text: 'text-[#1d9bf0]', arrow: '\u2192' },
    underperforming: { bg: 'bg-[#f4212e]/10', border: 'border-[#f4212e]/20', text: 'text-[#f4212e]', arrow: '\u2193' },
  }[status];

  const sign = percentDiff > 0 ? '+' : '';
  return (
    <div className={`mt-3 px-3 py-2 ${config.bg} border ${config.border} rounded-lg text-xs ${config.text} text-center font-semibold`}>
      {config.arrow} {sign}{percentDiff.toFixed(0)}% vs avg at {displayLabel}
    </div>
  );
}
