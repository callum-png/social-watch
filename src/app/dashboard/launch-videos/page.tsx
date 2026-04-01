"use client";

import { useState, useEffect, useRef } from "react";
import { TimeFilterTabs } from "@/components/time-filter-tabs";
import { TweetFeed } from "@/components/tweet-feed";

const MIN_LIKES_OPTIONS = [
  { label: "Any", value: 0 },
  { label: "100+", value: 100 },
  { label: "500+", value: 500 },
  { label: "1K+", value: 1000 },
  { label: "5K+", value: 5000 },
  { label: "10K+", value: 10000 },
];

export default function LaunchVideosPage() {
  const [timeRange, setTimeRange] = useState("7days");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [minLikes, setMinLikes] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Launches</h1>
          <p className="text-sm text-[#8b9199] mt-1">
            Viral product launches, funding announcements, and first-of-its-kind claims
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <TimeFilterTabs value={timeRange} onChange={setTimeRange} />
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b9199]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search launches..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-[#111214] border border-[#2a2d32] rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder-[#8b9199] focus:outline-none focus:border-[#1d9bf0] transition-colors"
          />
        </div>
        <select
          value={minLikes}
          onChange={(e) => setMinLikes(Number(e.target.value))}
          className="bg-[#111214] border border-[#2a2d32] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#1d9bf0] transition-colors"
        >
          {MIN_LIKES_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.value === 0 ? "Min likes: Any" : `Min likes: ${opt.label}`}
            </option>
          ))}
        </select>
      </div>

      <TweetFeed
        key={`${timeRange}:${search || ""}:${minLikes}`}
        category="launch_videos"
        timeRange={timeRange}
        search={search || undefined}
        minLikes={minLikes || undefined}
        emptyMessage="No launch posts found yet."
      />
    </div>
  );
}
