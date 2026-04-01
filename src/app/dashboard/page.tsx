"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TweetCardCompact } from "@/components/tweet-card";
import { formatNumber } from "@/lib/utils";

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
  impressionCount: number;
  mediaUrls: string[] | null;
  mediaType: string | null;
  videoUrl: string | null;
  tweetUrl: string;
}

interface CategoryRow {
  title: string;
  href: string;
  tweets: Tweet[];
  loading: boolean;
}

function SkeletonCard() {
  return (
    <div className="w-[280px] sm:w-[340px] md:w-[390px] flex-shrink-0 rounded-2xl border border-[#1e2025] overflow-hidden bg-[#111214]">
      <div className="h-[192px] relative overflow-hidden">
        <div className="absolute inset-0 skeleton-shimmer" />
      </div>
      <div className="px-3.5 py-2.5 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#1a1c20] animate-pulse" />
          <div className="h-3 bg-[#1a1c20] rounded-full w-20 animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <div className="h-2.5 bg-[#1a1c20] rounded-full w-full animate-pulse" />
          <div className="h-2.5 bg-[#1a1c20] rounded-full w-3/4 animate-pulse" />
        </div>
        <div className="pt-2 border-t border-[#1e2025] flex gap-5">
          <div className="h-2.5 bg-[#1a1c20] rounded-full w-10 animate-pulse" />
          <div className="h-2.5 bg-[#1a1c20] rounded-full w-10 animate-pulse" />
          <div className="h-2.5 bg-[#1a1c20] rounded-full w-10 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const [rows, setRows] = useState<CategoryRow[]>([
    { title: "Launches", href: "/dashboard/launch-videos", tweets: [], loading: true },
    { title: "Memes", href: "/dashboard/memes", tweets: [], loading: true },
  ]);
  const [userRows, setUserRows] = useState<CategoryRow[]>([]);

  useEffect(() => {
    const fetchCategory = async (category: string, index: number) => {
      try {
        const res = await fetch(
          `/api/tweets?category=${category}&timeRange=all&limit=10&sortBy=created_at`
        );
        const data = await res.json();
        setRows((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], tweets: data.tweets ?? [], loading: false };
          return updated;
        });
      } catch {
        setRows((prev) => {
          const updated = [...prev];
          updated[index] = { ...updated[index], loading: false };
          return updated;
        });
      }
    };

    fetchCategory("launch_videos", 0);
    fetchCategory("memes", 1);

    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/searches?category=individual_user");
        const data = await res.json();
        const seen = new Set<string>();
        const handles: string[] = [];
        for (const s of data.searches ?? []) {
          const match = s.rawQuery?.match(/from:(\w+)/i);
          const handle = match?.[1];
          if (handle && !seen.has(handle.toLowerCase())) {
            seen.add(handle.toLowerCase());
            handles.push(handle);
          }
        }

        const userCategoryRows: CategoryRow[] = handles.map((h) => ({
          title: `@${h}`,
          href: `/dashboard/users/${h}`,
          tweets: [],
          loading: true,
        }));
        setUserRows(userCategoryRows);

        for (let i = 0; i < handles.length; i++) {
          try {
            const res = await fetch(
              `/api/tweets?category=individual_user&authorHandle=${handles[i]}&timeRange=all&limit=10&sortBy=created_at`
            );
            const data = await res.json();
            setUserRows((prev) => {
              const updated = [...prev];
              if (updated[i]) {
                updated[i] = { ...updated[i], tweets: data.tweets ?? [], loading: false };
              }
              return updated;
            });
          } catch {
            setUserRows((prev) => {
              const updated = [...prev];
              if (updated[i]) {
                updated[i] = { ...updated[i], loading: false };
              }
              return updated;
            });
          }
        }
      } catch {
        /* ignore */
      }
    };

    fetchUsers();
  }, []);

  const allRows = [...rows, ...userRows];

  return (
    <div className="space-y-8">
      {allRows.map((row, rowIndex) => {
        const totalViews = row.tweets.reduce((sum, t) => sum + (t.impressionCount || 0), 0);
        return (
          <section key={row.title}>
            {/* Section header */}
            <div className="flex items-end justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">{row.title}</h2>
                {!row.loading && row.tweets.length > 0 && (
                  <p className="text-sm text-[#6b7280] mt-0.5">
                    {row.tweets.length} posts{totalViews > 0 && <span className="text-[#8b9199] ml-1">&middot; {formatNumber(totalViews)} views</span>}
                  </p>
                )}
              </div>
              <Link
                href={row.href}
                className="text-sm font-medium text-[#1d9bf0] hover:text-[#4db5f7] transition-colors flex items-center gap-1 group"
              >
                View all
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Content */}
            {row.loading ? (
              <div className="flex gap-5 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : row.tweets.length === 0 ? (
              <div className="bg-[#111214] border border-[#1e2025] rounded-2xl p-12 text-center">
                <p className="text-[#6b7280] text-sm">No posts collected yet</p>
                <p className="text-[#3a3d42] text-xs mt-1">Results appear after the next cron cycle</p>
              </div>
            ) : (
              <div className="relative">
                <div className="flex gap-5 overflow-x-auto hide-scrollbar pb-1">
                  {row.tweets.map((tweet) => (
                    <TweetCardCompact key={tweet.tweetId} tweet={tweet} />
                  ))}
                </div>
                {row.tweets.length > 3 && (
                  <div className="absolute right-0 top-0 bottom-1 w-12 md:w-24 bg-gradient-to-l from-black to-transparent pointer-events-none" />
                )}
              </div>
            )}

            {/* Divider */}
            {rowIndex < allRows.length - 1 && (
              <div className="mt-8 h-px bg-[#1a1c20]" />
            )}
          </section>
        );
      })}
    </div>
  );
}
