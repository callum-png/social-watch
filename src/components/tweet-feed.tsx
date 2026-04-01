"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { TweetCard } from "./tweet-card";
import { EngagementFilter } from "./engagement-filter";

interface Tweet {
  id: number;
  tweetId: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorProfileImageUrl: string | null;
  text: string;
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  quoteCount: number;
  mediaUrls: string[] | null;
  mediaType: string | null;
  videoUrl: string | null;
  tweetUrl: string;
}

interface TweetFeedProps {
  category: string;
  timeRange: string;
  authorHandle?: string;
  userId?: string;
  search?: string;
  minLikes?: number;
  emptyMessage?: string;
}

export function TweetFeed({
  category,
  timeRange,
  authorHandle,
  userId,
  search,
  minLikes,
  emptyMessage = "No posts found.",
}: TweetFeedProps) {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [engagement, setEngagement] = useState("all");
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const fetchTweets = useCallback(
    async (pageNum: number, append = false) => {
      const requestId = ++requestIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      if (!append) {
        setTweets([]);
        setHasMore(false);
        setTotal(0);
      }

      try {
        const params = new URLSearchParams({
          category,
          timeRange,
          page: String(pageNum),
          limit: "20",
        });
        if (engagement !== "all") params.set("engagement", engagement);
        if (authorHandle) params.set("authorHandle", authorHandle);
        if (userId) params.set("userId", userId);
        if (search) params.set("search", search);
        if (minLikes) params.set("minLikes", String(minLikes));

        const res = await fetch(`/api/tweets?${params}`, { signal: controller.signal });
        const data = await res.json();

        if (requestId !== requestIdRef.current) return;

        if (append) {
          setTweets((prev) => [...prev, ...(data.tweets ?? [])]);
        } else {
          setTweets(data.tweets ?? []);
        }
        setHasMore(Boolean(data.hasMore));
        setTotal(Number(data.total ?? 0));
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        console.error("Failed to fetch tweets:", error);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [category, timeRange, engagement, authorHandle, userId, search, minLikes]
  );

  useEffect(() => {
    setPage(1);
    fetchTweets(1);
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchTweets]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTweets(nextPage, true);
  };

  const handleEngagementChange = (value: string) => {
    setEngagement(value);
    setPage(1);
  };

  if (loading && tweets.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-[#2a2d32] rounded-xl p-4 animate-pulse">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1a1c20]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[#1a1c20] rounded w-1/3" />
                <div className="h-4 bg-[#1a1c20] rounded w-full" />
                <div className="h-4 bg-[#1a1c20] rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tweets.length === 0 && !loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <p className="text-sm text-[#5c6370]">0 posts found</p>
          <EngagementFilter value={engagement} onChange={handleEngagementChange} />
        </div>
        <div className="text-center py-12 text-[#5c6370]">
          <p className="text-lg">{emptyMessage}</p>
          <p className="text-sm mt-1 text-[#3a3d42]">Results will appear as they are found.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-sm text-[#5c6370]">
          {total} {total === 1 ? "post" : "posts"} found
        </p>
        <EngagementFilter value={engagement} onChange={handleEngagementChange} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tweets.map((tweet) => (
          <TweetCard
            key={tweet.tweetId}
            tweet={{
              ...tweet,
              onHide: () => {
                setTweets((prev) => prev.filter((t) => t.id !== tweet.id));
                setTotal((prev) => prev - 1);
              },
            }}
          />
        ))}
      </div>
      {hasMore && (
        <div className="text-center mt-6">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2 bg-[#1d9bf0] text-white rounded-lg hover:bg-[#1a8cd8] disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
