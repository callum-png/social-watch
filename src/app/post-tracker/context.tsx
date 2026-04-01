'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PTPost, fetchPTPosts, clearPostTrackerPassword } from '@/lib/post-tracker-api';

interface PostTrackerContextType {
  posts: PTPost[];
  loading: boolean;
  error: string | null;
  loadPosts: () => Promise<void>;
  activePosts: PTPost[];
  completedPosts: PTPost[];
}

const PostTrackerContext = createContext<PostTrackerContextType | undefined>(undefined);

export function PostTrackerProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<PTPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPosts() {
    try {
      const data = await fetchPTPosts();
      setPosts(data);
      setError(null);
    } catch (err: any) {
      if (err?.message === 'Unauthorized') {
        clearPostTrackerPassword();
        window.location.href = '/login?from=/post-tracker';
        return;
      }
      setError('Failed to load posts. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
    const interval = setInterval(loadPosts, 120000);
    return () => clearInterval(interval);
  }, []);

  const activePosts = posts.filter(p => p['Status'] === 'tracking');
  const completedPosts = posts.filter(p => p['Status'] === 'complete');

  return (
    <PostTrackerContext.Provider
      value={{
        posts,
        loading,
        error,
        loadPosts,
        activePosts,
        completedPosts,
      }}
    >
      {children}
    </PostTrackerContext.Provider>
  );
}

export function usePostTracker() {
  const context = useContext(PostTrackerContext);
  if (!context) {
    throw new Error('usePostTracker must be used within PostTrackerProvider');
  }
  return context;
}
