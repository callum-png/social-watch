import {
  searchRecent,
  lookupTweets,
  resolveAuthor,
  type TwitterSearchResponse,
} from "./twitter";

interface MentionData {
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

/**
 * Build the Twitter search query for a campaign report.
 * Example: (Contra OR @bfrancois OR "contra app") -is:reply
 */
export function buildSearchQuery(
  brandName: string,
  founderHandle?: string | null,
  searchTerms?: string[]
): string {
  const parts: string[] = [brandName];

  if (founderHandle) {
    const handle = founderHandle.replace(/^@/, "");
    parts.push(`@${handle}`);
  }

  if (searchTerms?.length) {
    for (const term of searchTerms) {
      const trimmed = term.trim();
      if (trimmed) {
        // Quote multi-word terms
        parts.push(trimmed.includes(" ") ? `"${trimmed}"` : trimmed);
      }
    }
  }

  return `(${parts.join(" OR ")}) -is:reply`;
}

/**
 * Fetch social listening mentions for a campaign from Twitter via Apify.
 *
 * COST CONTROLS (Apify pay-per-use):
 * - maxTweets: hard cap on total tweets fetched (default 200)
 * - maxPages: max pagination calls (default 2)
 */
const MAX_TWEETS_DEFAULT = 200;
const MAX_PAGES_DEFAULT = 2;

export async function fetchCampaignMentions(params: {
  brandName: string;
  founderHandle?: string | null;
  searchTerms?: string[];
  startDate: Date;
  endDate?: Date | null;
  minFaves?: number;
  maxTweets?: number;
}): Promise<MentionData[]> {
  const query = buildSearchQuery(
    params.brandName,
    params.founderHandle,
    params.searchTerms
  );

  const minFaves = params.minFaves ?? 5;
  const maxTweets = params.maxTweets ?? MAX_TWEETS_DEFAULT;
  const mentions: MentionData[] = [];
  let totalFetched = 0;

  // Apify handles pagination internally via count; we just request up to maxTweets
  const perPage = Math.min(100, maxTweets);

  for (let page = 0; page < MAX_PAGES_DEFAULT; page++) {
    if (totalFetched >= maxTweets) break;

    const remaining = maxTweets - totalFetched;
    const count = Math.min(perPage, remaining);

    let data: TwitterSearchResponse;
    try {
      data = await searchRecent({
        query,
        max_results: count,
        start_time: params.startDate.toISOString(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // If rate limited or credits depleted, return what we have
      if (msg.includes("429") || msg.includes("402") || msg.includes("CreditsDepleted")) {
        break;
      }
      throw err;
    }

    if (data.data) {
      totalFetched += data.data.length;

      for (const tweet of data.data) {
        // Post-filter by date range if endDate specified
        if (params.endDate && new Date(tweet.created_at) > params.endDate) continue;

        // Post-filter by min faves
        if (tweet.public_metrics.like_count < minFaves) continue;

        const author = resolveAuthor(tweet.author_id, data.includes);
        mentions.push({
          tweetId: tweet.id,
          authorUsername: author?.username ?? null,
          authorDisplayName: author?.name ?? null,
          authorProfileImageUrl: author?.profile_image_url ?? null,
          text: tweet.text,
          tweetUrl: `https://x.com/${author?.username ?? "i"}/status/${tweet.id}`,
          createdAt: tweet.created_at,
          likeCount: tweet.public_metrics.like_count,
          retweetCount: tweet.public_metrics.retweet_count,
          replyCount: tweet.public_metrics.reply_count,
          quoteCount: tweet.public_metrics.quote_count,
          impressionCount: tweet.public_metrics.impression_count ?? 0,
        });
      }
    }

    // Apify doesn't support pagination tokens the same way; stop after first call
    // unless we need more and got a full page
    if (!data.data || data.data.length < count) break;
  }

  console.log(
    `[Campaign] Fetched ${totalFetched} tweets total, ${mentions.length} passed filter.`
  );

  return mentions;
}

/**
 * Extract tweet ID from a Twitter/X URL.
 * Supports: https://twitter.com/user/status/123, https://x.com/user/status/123
 */
export function extractTweetId(url: string): string | null {
  const match = url.match(
    /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/
  );
  return match?.[1] ?? null;
}

/**
 * Detect platform from a URL.
 */
export function detectPlatform(url: string): "twitter" | "linkedin" | null {
  if (/(?:twitter\.com|x\.com)\//.test(url)) return "twitter";
  if (/linkedin\.com\//.test(url)) return "linkedin";
  return null;
}

/**
 * Fetch metrics for creator tweet posts via batch lookup.
 */
export async function fetchCreatorTweetMetrics(
  tweetIds: string[]
): Promise<
  Map<
    string,
    {
      text: string;
      authorName: string | null;
      authorHandle: string | null;
      mediaUrl: string | null;
      metrics: {
        likeCount: number;
        retweetCount: number;
        replyCount: number;
        quoteCount: number;
        impressionCount: number;
      };
    }
  >
> {
  if (tweetIds.length === 0) return new Map();

  const data = await lookupTweets(tweetIds);

  const mediaMap = new Map<string, string>();
  if (data.includes?.media) {
    for (const m of data.includes.media) {
      const thumb =
        m.type === "photo"
          ? m.url
          : m.preview_image_url ?? null;
      if (thumb) mediaMap.set(m.media_key, thumb);
    }
  }

  const result = new Map<
    string,
    {
      text: string;
      authorName: string | null;
      authorHandle: string | null;
      mediaUrl: string | null;
      metrics: {
        likeCount: number;
        retweetCount: number;
        replyCount: number;
        quoteCount: number;
        impressionCount: number;
      };
    }
  >();

  if (data.data) {
    for (const tweet of data.data) {
      const author = resolveAuthor(tweet.author_id, data.includes);
      let mediaUrl: string | null = null;
      if (tweet.attachments?.media_keys?.length) {
        mediaUrl = mediaMap.get(tweet.attachments.media_keys[0]) ?? null;
      }
      result.set(tweet.id, {
        text: tweet.text,
        authorName: author?.name ?? null,
        authorHandle: author?.username ?? null,
        mediaUrl,
        metrics: {
          likeCount: tweet.public_metrics.like_count,
          retweetCount: tweet.public_metrics.retweet_count,
          replyCount: tweet.public_metrics.reply_count,
          quoteCount: tweet.public_metrics.quote_count,
          impressionCount: tweet.public_metrics.impression_count ?? 0,
        },
      });
    }
  }

  return result;
}
