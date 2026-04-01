"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

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

function detectPlatform(url: string): "twitter" | "linkedin" | null {
  if (/(?:twitter\.com|x\.com|t\.co)\//.test(url)) return "twitter";
  if (/linkedin\.com\//.test(url)) return "linkedin";
  return null;
}

interface ParsedPost {
  url: string;
  platform: "twitter" | "linkedin";
  rawText: string;
  likes: number | null;
  comments: number | null;
  retweets: number | null;
  views: number | null;
  screenshotUrl: string | null;
}

function parseTsvPosts(raw: string): ParsedPost[] {
  const lines = raw.split("\n");
  const posts: ParsedPost[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^deliverable\s*link/i.test(trimmed)) continue;
    if (/^\d+\s*hours?$/i.test(trimmed)) continue;
    if (/^24\s*hours/i.test(trimmed)) continue;

    const cols = trimmed.split("\t");
    const rawText = cols[0]?.trim() ?? "";
    if (!rawText) continue;

    const url = extractUrl(rawText);
    if (!url) continue;

    const platform = detectPlatform(url);
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
      rawText,
      likes: parseNum(cols[1]),
      comments: parseNum(cols[2]),
      retweets: parseNum(cols[3]),
      views: parseNum(cols[4]),
      screenshotUrl: null,
    });
  }

  return posts;
}

function getRecentDates(count: number): { value: string; label: string }[] {
  const dates: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const value = d.toISOString().split("T")[0];
    const label =
      i === 0
        ? "Today"
        : i === 1
          ? "Yesterday"
          : d.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
    dates.push({ value, label });
  }
  return dates;
}

export default function CreateCampaignReport() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [founderHandle, setFounderHandle] = useState("");
  const [searchTermsRaw, setSearchTermsRaw] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tsvPaste, setTsvPaste] = useState("");
  const recentDates = getRecentDates(14);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Screenshot state: index → uploaded URL
  const [screenshots, setScreenshots] = useState<Record<number, string>>({});
  const [uploading, setUploading] = useState<Record<number, boolean>>({});

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugEdited) {
      setSlug(slugify(val));
    }
  };

  const parsedPosts = tsvPaste ? parseTsvPosts(tsvPaste) : [];

  const handleScreenshotUpload = async (
    postIndex: number,
    file: File
  ) => {
    setUploading((prev) => ({ ...prev, [postIndex]: true }));

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/campaign-reports/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to upload screenshot");
        setUploading((prev) => ({ ...prev, [postIndex]: false }));
        return;
      }

      setScreenshots((prev) => ({ ...prev, [postIndex]: data.url }));
    } catch {
      setError("Failed to upload screenshot");
    }

    setUploading((prev) => ({ ...prev, [postIndex]: false }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const searchTerms = searchTermsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const creatorPosts = parsedPosts.map((p, i) => ({
      url: p.url,
      platform: p.platform,
      likes: p.likes,
      comments: p.comments,
      retweets: p.retweets,
      views: p.views,
      sortOrder: i,
      screenshotUrl: screenshots[i] || null,
    }));

    try {
      const res = await fetch("/api/campaign-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          brandName,
          founderHandle: founderHandle || undefined,
          searchTerms: searchTerms.length > 0 ? searchTerms : undefined,
          startDate,
          endDate: endDate || undefined,
          creatorPosts: creatorPosts.length > 0 ? creatorPosts : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create report");
        setSubmitting(false);
        return;
      }

      router.push(`/campaign-report/${data.report.slug}`);
    } catch {
      setError("Failed to create report");
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-[#0a0b0c] border border-[#2a2d32] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#4a4d52] focus:outline-none focus:border-[#1d9bf0] transition-colors";
  const labelClass = "block text-sm font-medium text-[#8b9199] mb-1.5";

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
        New Campaign Report
      </h1>
      <p className="text-sm text-[#6b7280] mb-8">
        Create a shareable report with social listening data and creator posts
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className={labelClass}>Report Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Contra Launch Campaign"
            className={inputClass}
            required
          />
        </div>

        {/* Slug */}
        <div>
          <label className={labelClass}>URL Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#4a4d52] whitespace-nowrap">
              /campaign-report/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(slugify(e.target.value));
                setSlugEdited(true);
              }}
              placeholder="contra-launch-campaign"
              className={inputClass}
              required
            />
          </div>
        </div>

        {/* Brand Name */}
        <div>
          <label className={labelClass}>Brand Name</label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Contra"
            className={inputClass}
            required
          />
          <p className="text-xs text-[#4a4d52] mt-1">
            Used as the primary search term for social listening
          </p>
        </div>

        {/* Founder Handle */}
        <div>
          <label className={labelClass}>Founder Handle (optional)</label>
          <input
            type="text"
            value={founderHandle}
            onChange={(e) => setFounderHandle(e.target.value)}
            placeholder="@bfrancois"
            className={inputClass}
          />
        </div>

        {/* Additional Search Terms */}
        <div>
          <label className={labelClass}>
            Additional Search Terms (optional)
          </label>
          <input
            type="text"
            value={searchTermsRaw}
            onChange={(e) => setSearchTermsRaw(e.target.value)}
            placeholder="contra app, contra freelance"
            className={inputClass}
          />
          <p className="text-xs text-[#4a4d52] mt-1">
            Comma-separated. Combined with brand name using OR.
          </p>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Start Date</label>
            <select
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select date...</option>
              {recentDates.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>End Date</label>
            <select
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
            >
              <option value="">Today (default)</option>
              {recentDates.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Creator Posts TSV Paste */}
        <div>
          <label className={labelClass}>
            Creator / Influencer Posts (paste from Google Sheets)
          </label>
          <textarea
            value={tsvPaste}
            onChange={(e) => setTsvPaste(e.target.value)}
            placeholder={`Paste from Google Sheets. Columns: Deliverable Link, Likes, Comments, Retweets, Views\n\nhttps://x.com/creator1/status/123\t500\t25\t100\t50000\nhttps://linkedin.com/posts/someone-activity-123\t200\t15\t\t10000`}
            rows={8}
            className={`${inputClass} resize-y font-mono text-xs`}
          />
          <p className="text-xs text-[#4a4d52] mt-1">
            Tab-separated from Google Sheets. Columns: Link, Likes, Comments,
            Retweets, Views. Metrics are optional.
          </p>
          {parsedPosts.length > 0 && (
            <div className="mt-3 bg-[#0a0b0c] border border-[#2a2d32] rounded-lg p-3">
              <p className="text-xs text-[#8b9199] mb-3">
                Parsed {parsedPosts.length} posts:
              </p>
              <div className="space-y-2.5">
                {parsedPosts.map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5 ${
                        p.platform === "twitter"
                          ? "bg-[#1d9bf0]/10 text-[#1d9bf0]"
                          : "bg-[#0a66c2]/10 text-[#0a66c2]"
                      }`}
                    >
                      {p.platform === "twitter" ? "X" : "LI"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                        <span className="truncate flex-1">{p.url}</span>
                        {(p.likes != null ||
                          p.views != null ||
                          p.retweets != null) && (
                          <span className="text-[#4a4d52] whitespace-nowrap">
                            {[
                              p.views != null ? `${p.views} views` : null,
                              p.likes != null ? `${p.likes} likes` : null,
                              p.retweets != null ? `${p.retweets} RTs` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </div>

                      {/* Screenshot upload for LinkedIn posts */}
                      {p.platform === "linkedin" && (
                        <div className="mt-1.5">
                          {screenshots[i] ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={screenshots[i]}
                                alt="Screenshot"
                                className="w-16 h-10 object-cover rounded border border-[#2a2d32]"
                              />
                              <span className="text-[10px] text-[#4a9e4a]">
                                Uploaded
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setScreenshots((prev) => {
                                    const next = { ...prev };
                                    delete next[i];
                                    return next;
                                  })
                                }
                                className="text-[10px] text-[#6b7280] hover:text-[#f4212e] transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <label className="inline-flex items-center gap-1.5 text-[10px] text-[#0a66c2] cursor-pointer hover:text-[#0d7ffa] transition-colors">
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              {uploading[i]
                                ? "Uploading..."
                                : "Add screenshot"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploading[i]}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleScreenshotUpload(i, file);
                                }}
                              />
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-[#2a1215] border border-[#f4212e]/30 rounded-lg px-4 py-3 text-sm text-[#f4212e]">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-[#1d9bf0] text-white text-sm font-semibold rounded-lg hover:bg-[#1a8cd8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating Report..." : "Create Report"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 text-sm font-medium text-[#6b7280] hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>

        {submitting && (
          <p className="text-xs text-[#6b7280]">
            Fetching social listening data from Twitter... This may take a few
            seconds.
          </p>
        )}
      </form>
    </div>
  );
}
