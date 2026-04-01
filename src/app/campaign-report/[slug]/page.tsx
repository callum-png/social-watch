"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { use } from "react";

// ─── Animation Hooks ───

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

function useCountUp(target: number, duration = 1800, active = false) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active || target === 0) {
      if (active) setValue(target);
      return;
    }

    let start: number | null = null;
    let raf: number;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active]);

  return value;
}

function formatAnimatedNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

// ─── Fade-in wrapper ───

function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView(0.1);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Stagger children wrapper ───

function StaggerChildren({
  children,
  className = "",
  staggerMs = 80,
}: {
  children: React.ReactNode[];
  className?: string;
  staggerMs?: number;
}) {
  const { ref, inView } = useInView(0.05);

  return (
    <div ref={ref} className={className}>
      {children.map((child, i) => (
        <div
          key={i}
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
            transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * staggerMs}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * staggerMs}ms`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

// ─── Interfaces ───

interface Mention {
  id: number;
  tweetId: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
  authorProfileImageUrl: string | null;
  text: string;
  tweetUrl: string;
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  quoteCount: number;
  impressionCount: number;
}

interface CreatorPost {
  id: number;
  platform: string;
  url: string;
  tweetId: string | null;
  authorName: string | null;
  authorHandle: string | null;
  metrics: {
    likeCount?: number;
    retweetCount?: number;
    replyCount?: number;
    quoteCount?: number;
    impressionCount?: number;
  } | null;
  text: string | null;
  screenshotUrl: string | null;
  sortOrder: number;
}

interface Report {
  id: number;
  slug: string;
  title: string;
  brandName: string;
  founderHandle: string | null;
  startDate: string;
  endDate: string | null;
  lastFetchedAt: string | null;
}

interface PlatformStat {
  count: number;
  views: number;
  likes: number;
  retweets: number;
  replies: number;
}

interface Stats {
  totalMentions: number;
  totalViews: number;
  totalLikes: number;
  totalRetweets: number;
  totalReplies: number;
  totalEngagement: number;
  uniqueAuthors: number;
  creatorPostCount: number;
  platformStats?: {
    twitter: PlatformStat;
    linkedin: PlatformStat;
  };
}

// ─── Icons ───

function ViewsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function RetweetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

// ─── Animated Stat Pill ───

function AnimatedStatPill({
  icon,
  rawValue,
  label,
  active,
  delay = 0,
}: {
  icon: React.ReactNode;
  rawValue: number;
  label: string;
  active: boolean;
  delay?: number;
}) {
  const animatedValue = useCountUp(rawValue, 1800, active);

  return (
    <div
      className="flex flex-col items-center gap-1 bg-[#111214] border border-[#1e2025] rounded-2xl px-3 py-3 md:px-5 md:py-5 hover:border-[#2e3138] hover:bg-[#131517] hover:scale-[1.03] transition-all duration-500 ease-out cursor-default group"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="text-xl md:text-3xl font-bold text-white tracking-tight tabular-nums group-hover:text-[#1d9bf0] transition-colors duration-500">
        {formatAnimatedNumber(animatedValue)}
      </div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-[#6b7280] uppercase tracking-wider group-hover:text-[#8b9199] transition-colors duration-500">
        {icon}
        {label}
      </div>
    </div>
  );
}

// ─── TSV Parser (for Google Sheets paste) ───

function extractUrl(text: string): string | null {
  const urlMatch = text.match(
    /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com|linkedin\.com)[^\s"')}\]]+/
  );
  if (urlMatch) return urlMatch[0];
  const tcoMatch = text.match(/https?:\/\/t\.co\/[a-zA-Z0-9]+/);
  if (tcoMatch) return tcoMatch[0];
  const anyUrl = text.match(/https?:\/\/[^\s"')}\]]+/);
  if (anyUrl) return anyUrl[0];
  return null;
}

function detectPlatformClient(url: string): "twitter" | "linkedin" | null {
  if (/(?:twitter\.com|x\.com|t\.co)\//.test(url)) return "twitter";
  if (/linkedin\.com\//.test(url)) return "linkedin";
  return null;
}

interface ParsedPost {
  url: string;
  platform: "twitter" | "linkedin";
  likes: number | null;
  comments: number | null;
  retweets: number | null;
  views: number | null;
}

function parseTsvPosts(raw: string): ParsedPost[] {
  const lines = raw.split("\n");
  const posts: ParsedPost[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^deliverable\s*link/i.test(trimmed)) continue;
    if (/^\d+\s*hours?$/i.test(trimmed)) continue;

    const cols = trimmed.split("\t");
    const rawText = cols[0]?.trim() ?? "";
    if (!rawText) continue;

    const url = extractUrl(rawText);
    if (!url) continue;

    const platform = detectPlatformClient(url);
    if (!platform) continue;

    const parseNum = (val: string | undefined): number | null => {
      if (!val) return null;
      const cleaned = val.trim().replace(/,/g, "");
      const n = parseInt(cleaned);
      return isNaN(n) ? null : n;
    };

    posts.push({
      url,
      platform,
      likes: parseNum(cols[1]),
      comments: parseNum(cols[2]),
      retweets: parseNum(cols[3]),
      views: parseNum(cols[4]),
    });
  }

  return posts;
}

// ─── Edit Panel ───

function EditPanel({
  slug,
  creatorPosts,
  onClose,
  onUpdate,
}: {
  slug: string;
  creatorPosts: CreatorPost[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [urlInput, setUrlInput] = useState("");
  const [tsvInput, setTsvInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showTsv, setShowTsv] = useState(false);

  const addSinglePost = async () => {
    if (!urlInput.trim()) return;
    setAdding(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/campaign-reports/${slug}/creator-posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.error, type: "error" });
      } else {
        setMessage({ text: "Post added", type: "success" });
        setUrlInput("");
        onUpdate();
      }
    } catch {
      setMessage({ text: "Failed to add post", type: "error" });
    }
    setAdding(false);
  };

  const bulkImport = async () => {
    const parsed = parseTsvPosts(tsvInput);
    if (!parsed.length) {
      setMessage({ text: "No valid post URLs found in pasted data", type: "error" });
      return;
    }

    setBulkAdding(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/campaign-reports/${slug}/creator-posts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posts: parsed.map((p) => ({
            url: p.url,
            likes: p.likes,
            comments: p.comments,
            retweets: p.retweets,
            views: p.views,
          })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.error, type: "error" });
      } else {
        const parts = [];
        if (data.added > 0) parts.push(`${data.added} added`);
        if (data.duplicates > 0) parts.push(`${data.duplicates} duplicates skipped`);
        setMessage({ text: parts.join(", ") || "Done", type: "success" });
        setTsvInput("");
        onUpdate();
      }
    } catch {
      setMessage({ text: "Failed to import posts", type: "error" });
    }
    setBulkAdding(false);
  };

  const refreshPosts = async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/campaign-reports/${slug}/refresh`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error, type: "error" });
      } else {
        setMessage({ text: `Refreshed ${data.updated} posts with latest data`, type: "success" });
        onUpdate();
      }
    } catch {
      setMessage({ text: "Failed to refresh posts", type: "error" });
    }
    setRefreshing(false);
  };

  const deletePost = async (postId: number) => {
    setDeleting(postId);
    try {
      await fetch(`/api/campaign-reports/${slug}/creator-posts?postId=${postId}`, {
        method: "DELETE",
      });
      onUpdate();
    } catch {
      setMessage({ text: "Failed to delete post", type: "error" });
    }
    setDeleting(null);
  };

  return (
    <div className="bg-[#111214] border border-[#1e2025] rounded-2xl p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Edit Campaign Posts</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshPosts}
            disabled={refreshing}
            className="text-xs text-[#1d9bf0] hover:text-[#1a8cd8] disabled:opacity-40 transition-colors"
          >
            {refreshing ? "Refreshing..." : "Refresh post data"}
          </button>
          <button onClick={onClose} className="text-xs text-[#6b7280] hover:text-white transition-colors">
            Done
          </button>
        </div>
      </div>

      {/* Add single post */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSinglePost()}
          placeholder="Paste X or LinkedIn post URL..."
          className="flex-1 bg-[#0a0b0c] border border-[#2a2d32] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4a4d52] focus:outline-none focus:border-[#1d9bf0] transition-colors"
        />
        <button
          onClick={addSinglePost}
          disabled={adding || !urlInput.trim()}
          className="px-4 py-2 bg-[#1d9bf0] text-white text-sm font-medium rounded-lg hover:bg-[#1a8cd8] disabled:opacity-40 transition-colors flex items-center gap-1.5"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          {adding ? "Adding..." : "Add"}
        </button>
      </div>

      {/* Toggle Google Sheets paste */}
      <button
        onClick={() => setShowTsv(!showTsv)}
        className="text-xs text-[#1d9bf0] hover:text-[#1a8cd8] transition-colors mb-3"
      >
        {showTsv ? "Hide" : "Import from Google Sheets"}
      </button>

      {showTsv && (
        <div className="mb-3">
          <textarea
            value={tsvInput}
            onChange={(e) => setTsvInput(e.target.value)}
            placeholder={"Paste from Google Sheets\nColumns: Link, Likes, Comments, Retweets, Views"}
            rows={4}
            className="w-full bg-[#0a0b0c] border border-[#2a2d32] rounded-lg px-3 py-2 text-xs text-white placeholder-[#4a4d52] focus:outline-none focus:border-[#1d9bf0] transition-colors font-mono resize-y"
          />
          {tsvInput && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-[#6b7280]">
                {parseTsvPosts(tsvInput).length} posts detected
              </span>
              <button
                onClick={bulkImport}
                disabled={bulkAdding || !parseTsvPosts(tsvInput).length}
                className="px-3 py-1.5 bg-[#1d9bf0] text-white text-xs font-medium rounded-lg hover:bg-[#1a8cd8] disabled:opacity-40 transition-colors"
              >
                {bulkAdding ? "Importing..." : "Import All"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status message */}
      {message && (
        <div className={`text-xs px-3 py-2 rounded-lg mb-3 ${
          message.type === "success"
            ? "bg-[#0a2a15] text-[#4ade80] border border-[#4ade80]/20"
            : "bg-[#2a1215] text-[#f4212e] border border-[#f4212e]/20"
        }`}>
          {message.text}
        </div>
      )}

      {/* Existing posts list */}
      {creatorPosts.length > 0 && (
        <div className="border-t border-[#1e2025] pt-3 mt-1">
          <p className="text-xs text-[#6b7280] mb-2">{creatorPosts.length} posts in report</p>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {creatorPosts.map((post) => (
              <div key={post.id} className="flex items-center gap-2 group/item">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  post.platform === "twitter"
                    ? "bg-[#1d9bf0]/10 text-[#1d9bf0]"
                    : "bg-[#0a66c2]/10 text-[#0a66c2]"
                }`}>
                  {post.platform === "twitter" ? "X" : "LI"}
                </span>
                <span className="text-xs text-[#8b9199] truncate flex-1">
                  {post.authorHandle ? `@${post.authorHandle}` : post.authorName ?? post.url}
                </span>
                {post.metrics && (
                  <span className="text-[10px] text-[#4a4d52] whitespace-nowrap">
                    {formatAnimatedNumber(post.metrics.likeCount ?? 0)} likes
                  </span>
                )}
                <button
                  onClick={() => deletePost(post.id)}
                  disabled={deleting === post.id}
                  className="opacity-0 group-hover/item:opacity-100 text-[#6b7280] hover:text-[#f4212e] transition-all"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Post Card ───

function PostCard({ post, rank }: { post: CreatorPost; rank?: number }) {
  const isLinkedIn = post.platform === "linkedin";
  const views = post.metrics?.impressionCount ?? 0;
  const likes = post.metrics?.likeCount ?? 0;
  const retweets = post.metrics?.retweetCount ?? 0;
  const replies = post.metrics?.replyCount ?? 0;

  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col bg-[#111214] border border-[#1e2025] rounded-2xl overflow-hidden hover:border-[#3a3d42] hover:bg-[#141618] transition-all duration-500 ease-out hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:translate-y-[-4px]"
      style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.3)" }}
    >
      {/* Rank badge */}
      {rank != null && (
        <div className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-black/70 backdrop-blur-md border border-[#2a2d32] flex items-center justify-center text-xs font-bold text-white group-hover:border-[#1d9bf0]/50 group-hover:bg-[#1d9bf0]/20 transition-all duration-500">
          {rank}
        </div>
      )}

      {/* Platform icon + external link */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-500 group-hover:scale-110 ${
            isLinkedIn
              ? "bg-[#0a66c2]/90 group-hover:bg-[#0a66c2]"
              : "bg-black/70 border border-[#2a2d32] group-hover:border-[#4a4d52]"
          }`}
        >
          {isLinkedIn ? (
            <LinkedInIcon className="w-3.5 h-3.5 text-white" />
          ) : (
            <XIcon className="w-3.5 h-3.5 text-white" />
          )}
        </div>
        <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-[#2a2d32] flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-500">
          <ExternalLinkIcon className="w-3 h-3 text-white" />
        </div>
      </div>

      {/* Media thumbnail (screenshot or Twitter media) */}
      {post.screenshotUrl && (
        <div className="w-full overflow-hidden">
          <img
            src={post.screenshotUrl}
            alt="Post media"
            className="w-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
            style={{ maxHeight: "280px" }}
          />
        </div>
      )}

      {/* Content area */}
      <div className={`flex-1 p-5 ${post.screenshotUrl ? "pt-4" : "pt-12"}`}>
        <div className="mb-3">
          <div className="text-sm font-semibold text-white truncate group-hover:text-[#e8eaed] transition-colors duration-300">
            {post.authorName ?? (isLinkedIn ? "LinkedIn Post" : "Post")}
          </div>
          {post.authorHandle && (
            <div className="text-xs text-[#4a4d52] group-hover:text-[#6b7280] transition-colors duration-300">@{post.authorHandle}</div>
          )}
        </div>
        {post.text && (
          <p className="text-[13px] text-[#8b9199] line-clamp-2 leading-relaxed group-hover:text-[#a0a4aa] transition-colors duration-300">
            {post.text}
          </p>
        )}
      </div>

      {/* Metrics bar */}
      <div className="px-5 py-3.5 border-t border-[#1e2025] bg-[#0c0d0f] group-hover:bg-[#0f1012] transition-colors duration-500">
        <div className="flex items-center gap-3">
          {views > 0 && (
            <div className="flex items-center gap-1 text-xs text-[#8b9199]">
              <ViewsIcon className="w-3.5 h-3.5 text-[#6b7280]" />
              <span className="font-semibold text-white">{formatAnimatedNumber(views)}</span>
            </div>
          )}
          {likes > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <HeartIcon className="w-3.5 h-3.5 text-[#e8455f] group-hover:scale-125 transition-transform duration-300" />
              <span className="font-semibold text-white">{formatAnimatedNumber(likes)}</span>
            </div>
          )}
          {retweets > 0 && (
            <div className="flex items-center gap-1 text-xs text-[#8b9199]">
              <RetweetIcon className="w-3.5 h-3.5" />
              <span className="font-semibold text-white">{formatAnimatedNumber(retweets)}</span>
            </div>
          )}
          {replies > 0 && (
            <div className="flex items-center gap-1 text-xs text-[#8b9199]">
              <ReplyIcon className="w-3.5 h-3.5" />
              <span className="font-semibold text-white">{formatAnimatedNumber(replies)}</span>
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

// ─── Mention Card ───

function MentionCard({ mention }: { mention: Mention }) {
  return (
    <a
      href={mention.tweetUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-[#111214] border border-[#1e2025] rounded-xl p-4 hover:border-[#2e3138] hover:bg-[#131517] hover:translate-y-[-2px] hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all duration-500 ease-out"
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        {mention.authorProfileImageUrl ? (
          <img
            src={mention.authorProfileImageUrl}
            alt=""
            className="w-8 h-8 rounded-full ring-1 ring-[#2a2d32] group-hover:ring-[#3a3d42] group-hover:scale-105 transition-all duration-500"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#1d9bf0] flex items-center justify-center text-xs font-bold text-white group-hover:scale-105 transition-transform duration-500">
            {(mention.authorUsername ?? "?")[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate group-hover:text-[#e8eaed] transition-colors duration-300">
            {mention.authorDisplayName ?? mention.authorUsername}
          </div>
          <div className="text-xs text-[#4a4d52] group-hover:text-[#6b7280] transition-colors duration-300">@{mention.authorUsername}</div>
        </div>
        <div className="text-xs text-[#4a4d52] group-hover:text-[#6b7280] transition-colors duration-300">
          {new Date(mention.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>
      <p className="text-[13px] text-[#8b9199] line-clamp-3 leading-relaxed mb-3 group-hover:text-[#a0a4aa] transition-colors duration-300">
        {mention.text}
      </p>
      <div className="flex items-center gap-4 pt-2.5 border-t border-[#1e2025] text-xs text-[#6b7280] group-hover:border-[#2a2d32] transition-colors duration-500">
        {mention.impressionCount > 0 && (
          <span className="flex items-center gap-1">
            <ViewsIcon className="w-3.5 h-3.5" />
            {formatAnimatedNumber(mention.impressionCount)}
          </span>
        )}
        <span className="flex items-center gap-1">
          <HeartIcon className="w-3.5 h-3.5 text-[#e8455f] group-hover:scale-125 transition-transform duration-300" />
          {formatAnimatedNumber(mention.likeCount)}
        </span>
        <span className="flex items-center gap-1">
          <RetweetIcon className="w-3.5 h-3.5" />
          {formatAnimatedNumber(mention.retweetCount)}
        </span>
        <span className="flex items-center gap-1">
          <ReplyIcon className="w-3.5 h-3.5" />
          {formatAnimatedNumber(mention.replyCount)}
        </span>
      </div>
    </a>
  );
}

// ─── Section Header ───

function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
      </div>
      {count != null && (
        <span className="text-xs font-medium text-[#4a4d52] bg-[#1a1c20] px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-[#1e2025]" />
    </div>
  );
}

// ─── Platform Engagement Row ───

function PlatformEngagementRow({
  icon,
  label,
  stat,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  stat: PlatformStat;
  color: string;
}) {
  if (stat.count === 0) return null;
  const total = stat.likes + stat.retweets + stat.replies;

  return (
    <div className="flex items-center gap-4 bg-[#111214] border border-[#1e2025] rounded-xl px-4 py-3 hover:border-[#2e3138] transition-colors duration-300">
      <div className="flex items-center gap-2 min-w-[100px]">
        {icon}
        <span className="text-sm font-medium text-white">{label}</span>
      </div>
      <span className="text-xs text-[#4a4d52]">{stat.count} posts</span>
      <div className="flex-1" />
      <div className="flex items-center gap-4 text-xs">
        {stat.views > 0 && (
          <span className="flex items-center gap-1 text-[#8b9199]">
            <ViewsIcon className="w-3 h-3" />
            <span className="font-semibold text-white">{formatAnimatedNumber(stat.views)}</span>
          </span>
        )}
        <span className="flex items-center gap-1">
          <HeartIcon className="w-3 h-3 text-[#e8455f]" />
          <span className="font-semibold text-white">{formatAnimatedNumber(stat.likes)}</span>
        </span>
        {stat.retweets > 0 && (
          <span className="flex items-center gap-1 text-[#8b9199]">
            <RetweetIcon className="w-3 h-3" />
            <span className="font-semibold text-white">{formatAnimatedNumber(stat.retweets)}</span>
          </span>
        )}
        <span className="flex items-center gap-1 text-[#8b9199]">
          <ReplyIcon className="w-3 h-3" />
          <span className="font-semibold text-white">{formatAnimatedNumber(stat.replies)}</span>
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full`} style={{ color, background: `${color}15` }}>
          {formatAnimatedNumber(total)} eng
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ───

export default function CampaignReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [creatorPosts, setCreatorPosts] = useState<CreatorPost[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllMentions, setShowAllMentions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [allPostsFilter, setAllPostsFilter] = useState<"all" | "twitter" | "linkedin">("all");

  // IntersectionObserver for stats count-up
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsInView, setStatsInView] = useState(false);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsInView(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [stats]);

  const fetchReport = useCallback(() => {
    fetch(`/api/campaign-reports/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Report not found");
        return res.json();
      })
      .then((data) => {
        setReport(data.report);
        setMentions(data.mentions ?? []);
        setCreatorPosts(data.creatorPosts ?? []);
        setStats(data.stats);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-[#1a1c20] rounded-lg w-2/3 mx-auto" />
          <div className="h-5 bg-[#1a1c20] rounded w-1/3 mx-auto" />
          <div className="bg-[#111214] border border-[#1e2025] rounded-2xl h-40" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[#111214] border border-[#1e2025] rounded-2xl h-24" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[#111214] border border-[#1e2025] rounded-2xl h-40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-[#111214] border border-[#1e2025] rounded-2xl p-12 text-center">
          <p className="text-[#6b7280] text-sm">{error || "Report not found"}</p>
        </div>
      </div>
    );
  }

  // First creator post = the main launch post/video
  const mainPost = creatorPosts[0] ?? null;
  const otherPosts = creatorPosts.slice(1);

  // Split remaining posts by platform, take top 4 each
  const xPosts = otherPosts.filter((p) => p.platform === "twitter").slice(0, 4);
  const linkedInPosts = otherPosts.filter((p) => p.platform === "linkedin").slice(0, 4);

  const visibleMentions = showAllMentions ? mentions : mentions.slice(0, 20);

  return (
    <div className="max-w-5xl mx-auto">
      {/* ─── Header ─── */}
      <FadeIn className="mb-8 text-center relative">
        <div className="inline-flex items-center gap-2 text-xs text-[#4a4d52] mb-4 bg-[#111214] border border-[#1e2025] rounded-full px-4 py-1.5 hover:border-[#2e3138] hover:bg-[#161819] transition-all duration-500 cursor-default">
          <img src="/favicon.svg" alt="" className="w-3.5 h-3.5" />
          <span className="font-bold tracking-tight" style={{ fontFamily: "var(--font-brand), sans-serif" }}>
            Shown Media
          </span>
          <span className="text-[#2a2d32]">|</span>
          <span>Campaign Report</span>
        </div>

        {/* Edit button */}
        <button
          onClick={() => setEditing(!editing)}
          className={`absolute top-0 right-0 w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300 ${
            editing
              ? "bg-[#1d9bf0]/10 border-[#1d9bf0]/30 text-[#1d9bf0]"
              : "bg-[#111214] border-[#2a2d32] text-[#6b7280] hover:text-white hover:border-[#3a3d42]"
          }`}
        >
          <PencilIcon className="w-4 h-4" />
        </button>

        <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight mb-2">
          {report.title}
        </h1>
        <div className="flex items-center justify-center flex-wrap gap-2 md:gap-3 text-xs md:text-sm text-[#6b7280]">
          <span className="font-medium text-[#8b9199]">{report.brandName}</span>
          {report.founderHandle && (
            <>
              <span className="text-[#2a2d32]">&middot;</span>
              <span>@{report.founderHandle.replace(/^@/, "")}</span>
            </>
          )}
          <span className="text-[#2a2d32]">&middot;</span>
          <span>
            {new Date(report.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            {report.endDate
              ? ` – ${new Date(report.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
              : " – Present"}
          </span>
        </div>
      </FadeIn>

      {/* ─── Edit Panel ─── */}
      {editing && (
        <FadeIn className="mb-4">
          <EditPanel
            slug={slug}
            creatorPosts={creatorPosts}
            onClose={() => setEditing(false)}
            onUpdate={fetchReport}
          />
        </FadeIn>
      )}

      {/* ─── Launch Post Hero ─── */}
      {mainPost && (
        <FadeIn className="mb-8" delay={150}>
          <a
            href={mainPost.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block relative bg-gradient-to-b from-[#141518] to-[#111214] border border-[#1e2025] rounded-2xl overflow-hidden hover:border-[#3a3d42] hover:shadow-[0_12px_48px_rgba(29,155,240,0.08)] hover:translate-y-[-3px] transition-all duration-700 ease-out"
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
          >
            {/* Media thumbnail for launch post */}
            {mainPost.screenshotUrl && (
              <div className="w-full overflow-hidden">
                <img
                  src={mainPost.screenshotUrl}
                  alt="Launch media"
                  className="w-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                  style={{ maxHeight: "360px" }}
                />
              </div>
            )}

            <div className={`p-4 md:p-8 ${mainPost.screenshotUrl ? "pt-4 md:pt-6" : ""}`}>
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="text-xs text-[#4a4d52] bg-[#1a1c20] px-2.5 py-1 rounded-full font-medium group-hover:text-[#6b7280] group-hover:bg-[#1e2025] transition-all duration-500">
                  Launch Post
                </span>
                <div className="w-8 h-8 rounded-full bg-black/50 border border-[#2a2d32] flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-500">
                  <ExternalLinkIcon className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500 ${
                    mainPost.platform === "linkedin"
                      ? "bg-[#0a66c2]"
                      : "bg-black border-2 border-[#2a2d32] group-hover:border-[#4a4d52]"
                  }`}
                >
                  {mainPost.platform === "linkedin" ? (
                    <LinkedInIcon className="w-6 h-6 text-white" />
                  ) : (
                    <XIcon className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <div className="text-lg font-bold text-white group-hover:text-[#e8eaed] transition-colors duration-300">
                    {mainPost.authorName ?? report.brandName}
                  </div>
                  {mainPost.authorHandle && (
                    <div className="text-sm text-[#4a4d52] group-hover:text-[#6b7280] transition-colors duration-300">@{mainPost.authorHandle}</div>
                  )}
                </div>
              </div>

              {mainPost.text && (
                <p className="text-base text-[#c9cdd3] leading-relaxed mb-5 max-w-3xl group-hover:text-[#dde0e4] transition-colors duration-300">
                  {mainPost.text}
                </p>
              )}

              {mainPost.metrics && (
                <div className="flex items-center flex-wrap gap-4 md:gap-8 pt-5 border-t border-[#1e2025] group-hover:border-[#2a2d32] transition-colors duration-500">
                  {(mainPost.metrics.impressionCount ?? 0) > 0 && (
                    <div className="group/stat">
                      <div className="text-xl font-bold text-white group-hover/stat:text-[#1d9bf0] transition-colors duration-300">{formatAnimatedNumber(mainPost.metrics.impressionCount!)}</div>
                      <div className="text-xs text-[#6b7280] flex items-center gap-1 mt-0.5">
                        <ViewsIcon className="w-3 h-3" /> Views
                      </div>
                    </div>
                  )}
                  <div className="group/stat">
                    <div className="text-xl font-bold text-white group-hover/stat:text-[#e8455f] transition-colors duration-300">{formatAnimatedNumber(mainPost.metrics.likeCount ?? 0)}</div>
                    <div className="text-xs text-[#6b7280] flex items-center gap-1 mt-0.5">
                      <HeartIcon className="w-3 h-3 text-[#e8455f]" /> Likes
                    </div>
                  </div>
                  {(mainPost.metrics.retweetCount ?? 0) > 0 && (
                    <div className="group/stat">
                      <div className="text-xl font-bold text-white group-hover/stat:text-[#00ba7c] transition-colors duration-300">{formatAnimatedNumber(mainPost.metrics.retweetCount!)}</div>
                      <div className="text-xs text-[#6b7280] flex items-center gap-1 mt-0.5">
                        <RetweetIcon className="w-3 h-3" /> Reposts
                      </div>
                    </div>
                  )}
                  {(mainPost.metrics.replyCount ?? 0) > 0 && (
                    <div className="group/stat">
                      <div className="text-xl font-bold text-white group-hover/stat:text-[#1d9bf0] transition-colors duration-300">{formatAnimatedNumber(mainPost.metrics.replyCount!)}</div>
                      <div className="text-xs text-[#6b7280] flex items-center gap-1 mt-0.5">
                        <ReplyIcon className="w-3 h-3" /> Replies
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </a>
        </FadeIn>
      )}

      {/* ─── Aggregate Stats (count-up on scroll) ─── */}
      {stats && (
        <FadeIn className="mb-12" delay={300}>
          <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AnimatedStatPill
              icon={<ViewsIcon className="w-3.5 h-3.5" />}
              rawValue={stats.totalViews}
              label="Total Views"
              active={statsInView}
              delay={0}
            />
            <AnimatedStatPill
              icon={<HeartIcon className="w-3.5 h-3.5 text-[#e8455f]" />}
              rawValue={stats.totalLikes}
              label="Total Likes"
              active={statsInView}
              delay={100}
            />
            <AnimatedStatPill
              icon={<RetweetIcon className="w-3.5 h-3.5" />}
              rawValue={stats.totalRetweets}
              label="Reposts"
              active={statsInView}
              delay={200}
            />
            <AnimatedStatPill
              icon={<ReplyIcon className="w-3.5 h-3.5" />}
              rawValue={stats.totalReplies}
              label="Replies"
              active={statsInView}
              delay={300}
            />
          </div>
        </FadeIn>
      )}

      {/* ─── Per-Platform Engagement Breakdown ─── */}
      {stats?.platformStats && (stats.platformStats.twitter.count > 0 || stats.platformStats.linkedin.count > 0) && (
        <FadeIn className="mb-12">
          <SectionHeader
            icon={
              <div className="w-8 h-8 rounded-full bg-[#1d9bf0]/10 border border-[#1d9bf0]/20 flex items-center justify-center">
                <ViewsIcon className="w-4 h-4 text-[#1d9bf0]" />
              </div>
            }
            title="Engagement by Platform"
          />
          <div className="space-y-2">
            <PlatformEngagementRow
              icon={
                <div className="w-6 h-6 rounded-full bg-black border border-[#2a2d32] flex items-center justify-center">
                  <XIcon className="w-3 h-3 text-white" />
                </div>
              }
              label="X"
              stat={stats.platformStats.twitter}
              color="#1d9bf0"
            />
            <PlatformEngagementRow
              icon={
                <div className="w-6 h-6 rounded-full bg-[#0a66c2] flex items-center justify-center">
                  <LinkedInIcon className="w-3 h-3 text-white" />
                </div>
              }
              label="LinkedIn"
              stat={stats.platformStats.linkedin}
              color="#0a66c2"
            />
          </div>
        </FadeIn>
      )}

      {/* ─── Top X Posts ─── */}
      {xPosts.length > 0 && (
        <FadeIn className="mb-12">
          <SectionHeader
            icon={
              <div className="w-8 h-8 rounded-full bg-black border border-[#2a2d32] flex items-center justify-center">
                <XIcon className="w-4 h-4 text-white" />
              </div>
            }
            title="Top Posts on X"
            count={xPosts.length}
          />
          <StaggerChildren className="grid grid-cols-1 md:grid-cols-2 gap-4" staggerMs={100}>
            {xPosts.map((post, i) => (
              <PostCard key={post.id} post={post} rank={i + 1} />
            ))}
          </StaggerChildren>
        </FadeIn>
      )}

      {/* ─── Top LinkedIn Posts ─── */}
      {linkedInPosts.length > 0 && (
        <FadeIn className="mb-12">
          <SectionHeader
            icon={
              <div className="w-8 h-8 rounded-full bg-[#0a66c2] flex items-center justify-center">
                <LinkedInIcon className="w-4 h-4 text-white" />
              </div>
            }
            title="Top Posts on LinkedIn"
            count={linkedInPosts.length}
          />
          <StaggerChildren className="grid grid-cols-1 md:grid-cols-2 gap-4" staggerMs={100}>
            {linkedInPosts.map((post, i) => (
              <PostCard key={post.id} post={post} rank={i + 1} />
            ))}
          </StaggerChildren>
        </FadeIn>
      )}

      {/* ─── Social Listening Mentions ─── */}
      {mentions.length > 0 && (
        <FadeIn className="mb-12">
          <SectionHeader
            icon={
              <div className="w-8 h-8 rounded-full bg-[#1d9bf0]/10 border border-[#1d9bf0]/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#1d9bf0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            }
            title="Social Listening"
            count={mentions.length}
          />
          <StaggerChildren className="grid grid-cols-1 md:grid-cols-2 gap-3" staggerMs={60}>
            {visibleMentions.map((mention) => (
              <MentionCard key={mention.id} mention={mention} />
            ))}
          </StaggerChildren>
          {!showAllMentions && mentions.length > 20 && (
            <div className="mt-5 text-center">
              <button
                onClick={() => setShowAllMentions(true)}
                className="px-6 py-2.5 text-sm font-medium text-[#1d9bf0] bg-[#1d9bf0]/10 border border-[#1d9bf0]/20 rounded-full hover:bg-[#1d9bf0]/20 hover:border-[#1d9bf0]/40 hover:scale-[1.05] hover:shadow-[0_0_20px_rgba(29,155,240,0.15)] active:scale-[0.97] transition-all duration-500 ease-out"
              >
                Show all {mentions.length} mentions
              </button>
            </div>
          )}
          {showAllMentions && mentions.length > 20 && (
            <div className="mt-5 text-center">
              <button
                onClick={() => setShowAllMentions(false)}
                className="px-6 py-2.5 text-sm font-medium text-[#6b7280] hover:text-white hover:scale-[1.05] active:scale-[0.97] transition-all duration-500 ease-out"
              >
                Show less
              </button>
            </div>
          )}
        </FadeIn>
      )}

      {/* ─── All Posts (filtered by platform) ─── */}
      {creatorPosts.length > 1 && (
        <FadeIn className="mb-12">
          <SectionHeader
            icon={
              <div className="w-8 h-8 rounded-full bg-[#1e2025] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
            }
            title="All Posts"
            count={creatorPosts.length}
          />
          {/* Platform filter tabs */}
          <div className="flex items-center gap-1.5 mb-4">
            {(["all", "twitter", "linkedin"] as const).map((f) => {
              const count = f === "all" ? creatorPosts.length : creatorPosts.filter((p) => p.platform === f).length;
              if (f !== "all" && count === 0) return null;
              return (
                <button
                  key={f}
                  onClick={() => setAllPostsFilter(f)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                    allPostsFilter === f
                      ? "bg-[#1d9bf0]/10 text-[#1d9bf0] border border-[#1d9bf0]/30"
                      : "bg-[#111214] text-[#6b7280] border border-[#1e2025] hover:border-[#2e3138] hover:text-white"
                  }`}
                >
                  {f === "twitter" && <XIcon className="w-3 h-3" />}
                  {f === "linkedin" && <LinkedInIcon className="w-3 h-3" />}
                  {f === "all" ? "All" : f === "twitter" ? "X" : "LinkedIn"}
                  <span className="text-[10px] opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
          <StaggerChildren className="grid grid-cols-1 md:grid-cols-2 gap-4" staggerMs={80}>
            {creatorPosts
              .filter((p) => allPostsFilter === "all" || p.platform === allPostsFilter)
              .map((post, i) => (
                <PostCard key={post.id} post={post} rank={i + 1} />
              ))}
          </StaggerChildren>
        </FadeIn>
      )}

      {/* ─── Empty state ─── */}
      {mentions.length === 0 && creatorPosts.length === 0 && (
        <FadeIn>
          <div className="bg-[#111214] border border-[#1e2025] rounded-2xl p-12 text-center">
            <p className="text-[#6b7280] text-sm">No data collected yet</p>
            <p className="text-[#3a3d42] text-xs mt-1">Try refreshing the social listening data</p>
          </div>
        </FadeIn>
      )}

      {/* ─── Footer ─── */}
      <FadeIn>
        <div className="mt-16 pt-6 border-t border-[#1e2025] text-center pb-8">
          <div className="inline-flex items-center gap-2 text-xs text-[#3a3d42] hover:text-[#6b7280] transition-colors duration-500 cursor-default">
            <img src="/favicon.svg" alt="" className="w-3 h-3 opacity-40" />
            <span>
              Powered by{" "}
              <span className="font-bold" style={{ fontFamily: "var(--font-brand), sans-serif" }}>
                Shown Media
              </span>
            </span>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
