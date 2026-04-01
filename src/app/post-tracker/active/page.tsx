'use client';

import { useState } from 'react';
import { usePostTracker } from '../context';
import PostCard from '@/components/post-tracker/PostCard';
import PostDetail from '@/components/post-tracker/PostDetail';
import { computeHistoricalMedian } from '@/lib/post-tracker-api';

export default function ActivePostsPage() {
  const { posts, loading, error, activePosts, completedPosts } = usePostTracker();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const historicalAverage = computeHistoricalMedian(completedPosts);

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

  if (selectedPostId && posts.find(p => p['Post ID'] === selectedPostId)) {
    return (
      <PostDetail
        post={posts.find(p => p['Post ID'] === selectedPostId)!}
        completedPosts={completedPosts}
        historicalAverage={historicalAverage}
        onBack={() => setSelectedPostId(null)}
      />
    );
  }

  if (activePosts.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-[#5c6370] text-lg mb-2">No posts currently being tracked</div>
        <p className="text-[#3a3d42] text-sm">Paste a tweet URL above to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {activePosts.map((post) => (
        <PostCard
          key={post['Post ID']}
          post={post}
          onClick={() => setSelectedPostId(post['Post ID'])}
        />
      ))}
    </div>
  );
}
