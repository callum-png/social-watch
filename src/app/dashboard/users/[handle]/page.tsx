"use client";

import { useState, use } from "react";
import { TimeFilterTabs } from "@/components/time-filter-tabs";
import { TweetFeed } from "@/components/tweet-feed";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  const [timeRange, setTimeRange] = useState("7days");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">@{handle}</h1>
        <p className="text-sm text-gray-400 mt-1">
          Posts from monitored searches for this account
        </p>
      </div>

      <div className="mb-6">
        <TimeFilterTabs value={timeRange} onChange={setTimeRange} />
      </div>

      <TweetFeed
        category="individual_user"
        timeRange={timeRange}
        authorHandle={handle}
        emptyMessage={`No posts found for @${handle} yet.`}
      />
    </div>
  );
}
