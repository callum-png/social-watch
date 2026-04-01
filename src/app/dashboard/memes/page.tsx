"use client";

import { useState } from "react";
import { TimeFilterTabs } from "@/components/time-filter-tabs";
import { TweetFeed } from "@/components/tweet-feed";

export default function MemesPage() {
  const [timeRange, setTimeRange] = useState("7days");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Memes</h1>
          <p className="text-sm text-[#8b9199] mt-1">
            Viral meme pages and trending content
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <TimeFilterTabs value={timeRange} onChange={setTimeRange} />
      </div>

      <TweetFeed
        category="memes"
        timeRange={timeRange}
        emptyMessage="No meme posts found yet. Results will appear once the cron job runs."
      />
    </div>
  );
}
