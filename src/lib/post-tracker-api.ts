const API_URL = process.env.NEXT_PUBLIC_POST_TRACKER_API_URL || 'http://localhost:8000';

// Password management - stored in localStorage so login persists across sessions
export function getPostTrackerPassword(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('pt_api_password') || '';
}

export function setPostTrackerPassword(password: string): void {
  localStorage.setItem('pt_api_password', password);
}

export function clearPostTrackerPassword(): void {
  localStorage.removeItem('pt_api_password');
}

function authHeaders(): Record<string, string> {
  const pw = getPostTrackerPassword();
  if (pw) return { 'x-api-password': pw };
  return {};
}

export async function verifyPostTrackerPassword(password: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/auth`, {
    method: 'POST',
    headers: { 'x-api-password': password },
  });
  return res.ok;
}

export interface PTPost {
  'Post URL': string;
  'Post ID': string;
  'Account Handle': string;
  'Date Posted': string;
  'Date Added': string;
  'Campaign': string;
  'Status': string;
  'Last Error': string;
  'Media Type': string;
  'Media URL': string;
  'Media Preview URL': string;
  'Media Video URL': string;
  'Media Width': string;
  'Media Height': string;
  [key: string]: string;
}

export interface TrackingStatus {
  [postId: string]: {
    remaining_checkpoints: string[];
    completed: number;
    total: number;
  };
}

export interface CheckpointData {
  checkpoint: string;
  displayLabel: string;
  minutes: number;
  views: number;
  likes: number;
  retweets: number;
  replies: number;
  hasData: boolean;
}

function generateCheckpointNames(): { name: string; minutes: number }[] {
  const checkpoints: { name: string; minutes: number }[] = [];
  for (let i = 1; i <= 24; i++) {
    const minutes = i * 15;
    checkpoints.push({ name: `${minutes}min`, minutes });
  }
  for (let i = 1; i <= 18; i++) {
    const minutes = 360 + i * 60;
    checkpoints.push({ name: `${minutes}min`, minutes });
  }
  for (let i = 1; i <= 8; i++) {
    const minutes = 1440 + i * 180;
    checkpoints.push({ name: `${minutes}min`, minutes });
  }
  return checkpoints;
}

export const ALL_CHECKPOINTS = generateCheckpointNames();

/** Compute the median of a numeric array. Returns 0 for empty arrays. */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Compute historical median trajectory across all completed posts.
 * Returns one CheckpointData per checkpoint with median values.
 * Uses median (not mean) so outlier viral posts don't skew the reference line.
 */
export function computeHistoricalMedian(completedPosts: PTPost[]): CheckpointData[] {
  if (completedPosts.length === 0) return [];
  const raw = ALL_CHECKPOINTS.map(({ name, minutes }) => {
    const values = completedPosts
      .map(p => extractMetrics(p).find(m => m.checkpoint === name))
      .filter(v => v?.hasData);
    if (values.length === 0) return null;
    return {
      checkpoint: name,
      displayLabel: values[0]!.displayLabel,
      minutes,
      views: median(values.map(v => v!.views)),
      likes: median(values.map(v => v!.likes)),
      retweets: median(values.map(v => v!.retweets)),
      replies: median(values.map(v => v!.replies)),
      hasData: true,
    };
  }).filter((v): v is CheckpointData => v !== null);

  // Enforce monotonicity: each point must be >= the previous.
  // Cumulative metrics (views, likes, etc.) should never decrease over time.
  for (let i = 1; i < raw.length; i++) {
    raw[i] = {
      ...raw[i],
      views: Math.max(raw[i].views, raw[i - 1].views),
      likes: Math.max(raw[i].likes, raw[i - 1].likes),
      retweets: Math.max(raw[i].retweets, raw[i - 1].retweets),
      replies: Math.max(raw[i].replies, raw[i - 1].replies),
    };
  }

  return raw;
}

export function minutesToLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = minutes / 60;
  if (hours < 24) {
    return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
  }
  const days = hours / 24;
  return Number.isInteger(days) ? `${days}d` : `${days.toFixed(1)}d`;
}

export const DISPLAY_CHECKPOINTS = ALL_CHECKPOINTS.filter(cp =>
  [15, 30, 60, 120, 240, 360, 720, 1440, 2160, 2880].includes(cp.minutes)
);

export async function fetchPTPosts(): Promise<PTPost[]> {
  const res = await fetch(`${API_URL}/api/posts`, {
    cache: 'no-store',
    headers: { ...authHeaders() },
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('Failed to fetch posts');
  const data = await res.json();
  return data.posts;
}

export async function togglePTPostShown(postId: string, shown: boolean) {
  const res = await fetch(`${API_URL}/api/posts/${postId}/shown`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ shown }),
  });
  if (!res.ok) throw new Error('Failed to update shown status');
  return res.json();
}

export function isShownPost(post: PTPost): boolean {
  return post['Shown'] === 'true';
}

export async function addPTPost(url: string, campaign?: string) {
  const res = await fetch(`${API_URL}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ url, campaign: campaign || null }),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export function extractMetrics(post: PTPost): CheckpointData[] {
  // Stage 1: Parse raw values, keeping nulls to distinguish "no data" from "zero"
  const parsed = ALL_CHECKPOINTS.map(({ name, minutes }) => {
    const viewsStr = post[`${name}_views`] || '';
    const likesStr = post[`${name}_likes`] || '';
    const retweetsStr = post[`${name}_retweets`] || '';
    const repliesStr = post[`${name}_replies`] || '';

    let views = viewsStr === '' ? null : parseInt(viewsStr, 10);
    let likes = likesStr === '' ? null : parseInt(likesStr, 10);
    let retweets = retweetsStr === '' ? null : parseInt(retweetsStr, 10);
    let replies = repliesStr === '' ? null : parseInt(repliesStr, 10);

    // Fix column rotation from backend bug.
    // The Python backend had a bug that wrote metrics into the wrong sheet columns.
    // Two rotation patterns existed:
    //
    // Bug A: replies=views, views=likes, likes=retweets, retweets=replies
    //   Detection: replies >> views (replies has actual view count)
    //
    // Bug B: likes=views, retweets=likes, views=retweets, replies=replies
    //   Detection: likes >> views (likes has actual view count)
    //
    // For any real tweet, views is always the largest metric by far.
    // If a different column has an impossibly large value relative to views, it's rotated.
    const v = views ?? 0;
    const l = likes ?? 0;
    const rt = retweets ?? 0;
    const rp = replies ?? 0;

    let wasRotated = false;
    if (rp > 1000 && (v === 0 || rp > v * 10)) {
      // Bug A: columns were shifted right by one position
      const oV = views, oL = likes, oRt = retweets, oRp = replies;
      views = oRp;      // replies col had views
      likes = oV;       // views col had likes
      retweets = oL;    // likes col had retweets
      replies = oRt;    // retweets col had replies
      wasRotated = true;
    } else if (l > 1000 && (v === 0 || l > v * 10)) {
      // Bug B: columns were shifted left by one position
      const oV = views, oL = likes, oRt = retweets;
      views = oL;       // likes col had views
      likes = oRt;      // retweets col had likes
      retweets = oV;    // views col had retweets
      // replies col was correct
      wasRotated = true;
    }

    return {
      checkpoint: name,
      displayLabel: minutesToLabel(minutes),
      minutes,
      views,
      likes,
      retweets,
      replies,
      _rotated: wasRotated,
    };
  });

  // Stage 2: Null out boundary checkpoints between rotated and correct data.
  // At the transition, 1-2 checkpoints still have rotated data that wasn't
  // detected (the telltale huge value was missing). These have cross-metric
  // contamination that causes flatlines. Null ALL metrics at these boundary
  // points so interpolation fills them smoothly.
  const metricKeys = ['views', 'likes', 'retweets', 'replies'] as const;

  // Find the last rotated checkpoint index
  let lastRotatedIdx = -1;
  for (let i = parsed.length - 1; i >= 0; i--) {
    if (parsed[i]._rotated) { lastRotatedIdx = i; break; }
  }

  if (lastRotatedIdx >= 0) {
    // Find the first clearly correct checkpoint after the last rotated one.
    // A checkpoint is "clearly correct" if views is the dominant value (> all others * 5)
    // and it's reasonably close to the last rotated checkpoint's corrected views.
    let firstCorrectIdx = -1;
    const lastRotatedViews = parsed[lastRotatedIdx].views ?? 0;
    for (let i = lastRotatedIdx + 1; i < parsed.length; i++) {
      const p = parsed[i];
      if (p.views === null) continue;
      const pLikes = p.likes ?? 0;
      const pRt = p.retweets ?? 0;
      const pRp = p.replies ?? 0;
      // Views should be the largest value and in the same ballpark as the last rotated views
      if (p.views > pLikes * 5 && p.views > pRt * 5 && p.views > pRp * 5 &&
          (lastRotatedViews === 0 || p.views > lastRotatedViews * 0.5)) {
        firstCorrectIdx = i;
        break;
      }
    }

    // Null all metrics at checkpoints between last rotated and first correct
    if (firstCorrectIdx > lastRotatedIdx + 1) {
      for (let i = lastRotatedIdx + 1; i < firstCorrectIdx; i++) {
        parsed[i].views = null;
        parsed[i].likes = null;
        parsed[i].retweets = null;
        parsed[i].replies = null;
      }
    }
  }

  // Stage 3: Per-metric monotonicity + interpolation.
  // Process each metric independently so a failed fetch for one metric
  // doesn't cause it to flatline — it gets interpolated from its own
  // surrounding valid data points instead.

  for (const key of metricKeys) {
    // Enforce monotonicity: cumulative metrics should never decrease.
    let prevVal: number | null = null;
    for (const p of parsed) {
      if (p[key] === null) continue;
      if (prevVal !== null) p[key] = Math.max(p[key]!, prevVal);
      prevVal = p[key];
    }

    // Linear interpolation for null gaps
    for (let i = 0; i < parsed.length; i++) {
      if (parsed[i][key] !== null) continue;

      let prevIdx: number | null = null;
      let nextIdx: number | null = null;
      for (let j = i - 1; j >= 0; j--) {
        if (parsed[j][key] !== null) { prevIdx = j; break; }
      }
      for (let j = i + 1; j < parsed.length; j++) {
        if (parsed[j][key] !== null) { nextIdx = j; break; }
      }

      // Only interpolate between two known points — don't forward-fill past
      // the last data point or backward-fill before the first, so the chart
      // can distinguish real data from future checkpoints (enables projections).
      if (prevIdx === null || nextIdx === null) continue;

      const ratio = (parsed[i].minutes - parsed[prevIdx].minutes) /
                    (parsed[nextIdx].minutes - parsed[prevIdx].minutes);
      parsed[i][key] = Math.round(
        parsed[prevIdx][key]! + (parsed[nextIdx][key]! - parsed[prevIdx][key]!) * ratio
      );
    }
  }

  // Stage 3: Convert to CheckpointData — any checkpoint with at least one metric is included
  return parsed
    .filter(p => p.views !== null || p.likes !== null || p.retweets !== null || p.replies !== null)
    .map(p => ({
      checkpoint: p.checkpoint,
      displayLabel: p.displayLabel,
      minutes: p.minutes,
      views: p.views ?? 0,
      likes: p.likes ?? 0,
      retweets: p.retweets ?? 0,
      replies: p.replies ?? 0,
      hasData: true,
    }));
}

// ---------------------------------------------------------------------------
// Reply monitoring types & API
// ---------------------------------------------------------------------------

export interface ReplyAuthor {
  id: string;
  username: string;
  name: string;
  followers_count: number;
}

export interface PostReply {
  id: string;
  text: string;
  author: ReplyAuthor;
  created_at: string;
  is_flagged: boolean;
  is_question: boolean;
  flag_reasons: string[];
  like_count?: number;
  retweet_count?: number;
  reply_count?: number;
}

export interface RepliesResponse {
  post_id: string;
  replies: PostReply[];
  total: number;
  flagged: number;
  questions: number;
  too_old: boolean;
}

export async function fetchPostReplies(postId: string): Promise<RepliesResponse> {
  const res = await fetch(`${API_URL}/api/posts/${postId}/replies`, {
    cache: 'no-store',
    headers: { ...authHeaders() },
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('Failed to fetch replies');
  return res.json();
}

export async function fetchPostRepliesSummary(postId: string): Promise<Omit<RepliesResponse, 'replies'>> {
  const res = await fetch(`${API_URL}/api/posts/${postId}/replies/summary`, {
    cache: 'no-store',
    headers: { ...authHeaders() },
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('Failed to fetch reply summary');
  return res.json();
}

export interface QuoteTweetAuthor {
  id: string;
  username: string;
  name: string;
  followers_count: number;
}

export interface QuoteTweet {
  id: string;
  text: string;
  author: QuoteTweetAuthor;
  created_at: string;
  like_count: number;
  retweet_count: number;
  reply_count: number;
  url: string;
}

export interface QuoteTweetsResponse {
  post_id: string;
  quotes: QuoteTweet[];
  total: number;
}

export async function fetchQuoteTweets(postId: string): Promise<QuoteTweetsResponse> {
  const res = await fetch(`${API_URL}/api/posts/${postId}/quote-tweets`, {
    cache: 'no-store',
    headers: { ...authHeaders() },
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('Failed to fetch quote tweets');
  return res.json();
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}
