"use client";

import { useState, useRef } from "react";
import { formatRelativeTime, formatNumber } from "@/lib/utils";

interface TweetCardProps {
  id?: number;
  tweetId: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorProfileImageUrl: string | null;
  text: string;
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  impressionCount?: number;
  mediaUrls: string[] | null;
  mediaType: string | null;
  videoUrl?: string | null;
  tweetUrl: string;
  onHide?: () => void;
}

/** Compact card for horizontal scroll rows */
export function TweetCardCompact({ tweet }: { tweet: TweetCardProps }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = tweet.mediaType === "video" && tweet.videoUrl;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasVideo) {
      setPlaying(true);
      setTimeout(() => videoRef.current?.play(), 50);
    } else {
      window.open(tweet.tweetUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className="w-[280px] sm:w-[340px] md:w-[390px] flex-shrink-0 rounded-2xl overflow-hidden bg-[#111214] border border-[#1e2025] hover:border-[#2e3138] transition-all duration-200 group hover:translate-y-[-2px]"
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02) inset' }}
    >
      {/* Thumbnail / Video */}
      <div className={`${playing ? "aspect-video" : "h-[192px]"} relative overflow-hidden bg-[#0a0b0c]`}>
        {playing && hasVideo ? (
          <video
            ref={videoRef}
            src={tweet.videoUrl!}
            className="w-full h-full object-contain bg-black"
            controls
            autoPlay
            muted
            playsInline
          />
        ) : (
          <>
            {tweet.mediaUrls && tweet.mediaUrls.length > 0 ? (
              <img
                src={tweet.mediaUrls[0]}
                alt=""
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-[#0a0b0c]" />
            )}
            {/* Gradient overlay on thumbnail */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {/* Play button for videos */}
            {tweet.mediaType === "video" && (
              <button
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={handlePlayClick}
              >
                <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/25 hover:bg-black/70 hover:scale-110 transition-all">
                  <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </button>
            )}
          </>
        )}
        {/* Views badge */}
        {!playing && (
          <span className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-md text-white text-[13px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {formatNumber(tweet.impressionCount ?? 0)}
          </span>
        )}
        {/* Time badge */}
        {!playing && (
          <span className="absolute top-2.5 right-2.5 bg-black/50 backdrop-blur-md text-white/60 text-[11px] font-medium px-2 py-1 rounded-md">
            {formatRelativeTime(new Date(tweet.createdAt))}
          </span>
        )}
      </div>
      {/* Card body — clicks open tweet on X */}
      <a
        href={tweet.tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-3.5 py-2.5 cursor-pointer hover:bg-[#161819] transition-colors"
      >
        <div className="flex items-center gap-2 mb-1">
          {tweet.authorProfileImageUrl ? (
            <img src={tweet.authorProfileImageUrl} alt="" className="w-5 h-5 rounded-full ring-1 ring-[#2a2d32]" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-[#1d9bf0] flex items-center justify-center text-[8px] font-bold text-white">
              {(tweet.authorUsername ?? "?")[0].toUpperCase()}
            </div>
          )}
          <span className="text-[12px] font-semibold text-white/80 truncate">
            @{tweet.authorUsername}
          </span>
        </div>
        <p className="text-[12px] text-[#8b9199] line-clamp-2 leading-snug">{tweet.text}</p>
        <div className="flex items-center gap-5 mt-2 pt-2 border-t border-[#1e2025]">
          <span className="flex items-center gap-1.5 text-[12px] text-[#6b7280]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            {formatNumber(tweet.replyCount)}
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-[#6b7280]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            {formatNumber(tweet.retweetCount)}
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-[#e8455f]">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            {formatNumber(tweet.likeCount)}
          </span>
        </div>
      </a>
    </div>
  );
}

/** Full tweet card for detail/feed pages */
export function TweetCard({ tweet }: { tweet: TweetCardProps }) {
  const [hiding, setHiding] = useState(false);

  const handleHide = async () => {
    if (!tweet.id) return;
    setHiding(true);
    try {
      const res = await fetch(`/api/tweets/${tweet.id}/hide`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: true }),
      });
      if (res.ok) {
        tweet.onHide?.();
      }
    } catch (err) {
      console.error("Failed to hide tweet:", err);
    } finally {
      setHiding(false);
    }
  };

  return (
    <div className="border border-[#2a2d32] rounded-xl p-4 hover:bg-[#111214] transition-colors group relative">
      {tweet.id && (
        <button
          onClick={handleHide}
          disabled={hiding}
          className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity px-2 py-1 text-[10px] font-medium bg-black/50 hover:bg-black/70 border border-[#2a2d32] rounded-lg text-[#5c6370] hover:text-white disabled:opacity-50"
          title="Hide this tweet"
        >
          {hiding ? "Hiding..." : "Hide"}
        </button>
      )}
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          {tweet.authorProfileImageUrl ? (
            <img
              src={tweet.authorProfileImageUrl}
              alt={tweet.authorUsername ?? ""}
              className="w-10 h-10 rounded-full border border-[#2a2d32]"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#1d9bf0] flex items-center justify-center text-white font-bold text-sm">
              {(tweet.authorUsername ?? "?")[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-sm">
            <span className="font-bold text-white truncate">
              {tweet.authorDisplayName ?? tweet.authorUsername}
            </span>
            <span className="text-[#5c6370] truncate">@{tweet.authorUsername}</span>
            <span className="text-[#3a3d42] mx-1">&middot;</span>
            <span className="text-[#5c6370] text-xs whitespace-nowrap">
              {formatRelativeTime(new Date(tweet.createdAt))}
            </span>
          </div>
          <p className="text-[#8b9199] text-sm mt-1 whitespace-pre-wrap break-words">
            {tweet.text}
          </p>
          {tweet.mediaUrls && tweet.mediaUrls.length > 0 && (
            <div className="mt-2 rounded-xl overflow-hidden border border-[#2a2d32]">
              {tweet.mediaType === "video" ? (
                <div className="bg-[#111214] h-48 flex items-center justify-center text-[#5c6370]">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              ) : (
                <img src={tweet.mediaUrls[0]} alt="Tweet media" className="w-full max-h-72 object-cover" />
              )}
            </div>
          )}
          <div className="flex items-center gap-6 mt-3 text-[#5c6370] text-xs">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {formatNumber(tweet.replyCount)}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {formatNumber(tweet.retweetCount)}
            </span>
            <span className="flex items-center gap-1 text-[#f4212e]/70">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {formatNumber(tweet.likeCount)}
            </span>
          </div>
        </div>
        <a
          href={tweet.tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-[#5c6370] hover:text-white transition-colors"
          title="View on X"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
