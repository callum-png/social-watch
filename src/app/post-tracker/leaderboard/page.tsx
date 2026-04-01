'use client';

import { useState } from 'react';
import { usePostTracker } from '../context';
import LeaderboardPanel from '@/components/post-tracker/LeaderboardPanel';

type Metric = 'views' | 'likes' | 'retweets' | 'replies';

export default function LeaderboardPage() {
  const { posts, loading, error } = usePostTracker();
  const [selectedMetric, setSelectedMetric] = useState<Metric>('views');

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
    <LeaderboardPanel
      posts={posts}
      metric={selectedMetric}
      onMetricChange={setSelectedMetric}
    />
  );
}
