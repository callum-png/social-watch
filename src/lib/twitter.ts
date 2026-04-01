import {
  searchTweets,
  getTweetById,
  normalizeCreatedAt,
  type ApifyTweet,
} from "./apify";

export interface TwitterTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
    impression_count?: number;
  };
  attachments?: {
    media_keys?: string[];
  };
}

export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

export interface TwitterMedia {
  media_key: string;
  type: "photo" | "video" | "animated_gif";
  url?: string;
  preview_image_url?: string;
  variants?: { bit_rate?: number; content_type: string; url: string }[];
}

export interface TwitterSearchResponse {
  data?: TwitterTweet[];
  includes?: {
    users?: TwitterUser[];
    media?: TwitterMedia[];
  };
  meta?: {
    newest_id: string;
    oldest_id: string;
    result_count: number;
    next_token?: string;
  };
}

export interface SearchRecentParams {
  query: string;
  max_results?: number;
  since_id?: string;
  start_time?: string;
  next_token?: string;
}

/** Convert a flat ApifyTweet into the TwitterSearchResponse shape */
function apifyToSearchResponse(apifyTweets: ApifyTweet[]): TwitterSearchResponse {
  const users: TwitterUser[] = [];
  const media: TwitterMedia[] = [];
  const seenUsers = new Set<string>();
  const seenMedia = new Set<string>();

  const data: TwitterTweet[] = apifyTweets.map((t) => {
    // Collect unique users
    if (!seenUsers.has(t.user_id)) {
      seenUsers.add(t.user_id);
      users.push({
        id: t.user_id,
        name: t.user_name,
        username: t.username,
        profile_image_url: t.user_profile_image_url,
      });
    }

    // Collect unique media and build media_keys
    const mediaKeys: string[] = [];
    if (t.media) {
      for (const m of t.media) {
        if (!seenMedia.has(m.media_key)) {
          seenMedia.add(m.media_key);
          const twitterMedia: TwitterMedia = {
            media_key: m.media_key,
            type: (m.type as TwitterMedia["type"]) ?? "photo",
            url: m.url,
            preview_image_url: m.preview_image_url,
          };
          media.push(twitterMedia);
        }
        mediaKeys.push(m.media_key);
      }
    }

    return {
      id: t.id,
      text: t.full_text ?? t.text,
      author_id: t.user_id,
      created_at: normalizeCreatedAt(t.created_at),
      public_metrics: {
        like_count: t.favorite_count,
        retweet_count: t.retweet_count,
        reply_count: t.reply_count,
        quote_count: t.quote_count,
        impression_count: t.view_count,
      },
      attachments: mediaKeys.length > 0 ? { media_keys: mediaKeys } : undefined,
    };
  });

  const ids = data.map((t) => t.id);
  const meta =
    ids.length > 0
      ? {
          newest_id: ids[0],
          oldest_id: ids[ids.length - 1],
          result_count: ids.length,
        }
      : undefined;

  return {
    data: data.length > 0 ? data : undefined,
    includes: users.length > 0 || media.length > 0 ? { users, media } : undefined,
    meta,
  };
}

export async function searchRecent(
  params: SearchRecentParams
): Promise<TwitterSearchResponse> {
  const apifyTweets = await searchTweets(params.query, {
    count: params.max_results ?? 100,
    startTime: params.start_time,
  });
  return apifyToSearchResponse(apifyTweets);
}

export async function lookupTweets(
  ids: string[]
): Promise<TwitterSearchResponse> {
  const results = await Promise.all(ids.map((id) => getTweetById(id)));
  const found = results.filter((t): t is ApifyTweet => t !== null);
  return apifyToSearchResponse(found);
}

export function resolveAuthor(
  authorId: string,
  includes?: TwitterSearchResponse["includes"]
): TwitterUser | undefined {
  return includes?.users?.find((u) => u.id === authorId);
}

export function resolveMedia(
  tweet: TwitterTweet,
  includes?: TwitterSearchResponse["includes"]
): { urls: string[]; type: string | null; videoUrl: string | null } {
  if (!tweet.attachments?.media_keys || !includes?.media) {
    return { urls: [], type: null, videoUrl: null };
  }

  const mediaItems = tweet.attachments.media_keys
    .map((key) => includes.media!.find((m) => m.media_key === key))
    .filter(Boolean) as TwitterMedia[];

  const urls = mediaItems
    .map((m) => m.url || m.preview_image_url)
    .filter(Boolean) as string[];
  const type = mediaItems[0]?.type ?? null;

  // Extract best MP4 video URL from variants
  let videoUrl: string | null = null;
  const videoItem = mediaItems.find((m) => m.type === "video" || m.type === "animated_gif");
  if (videoItem?.variants) {
    const mp4s = videoItem.variants
      .filter((v) => v.content_type === "video/mp4" && v.bit_rate != null)
      .sort((a, b) => (b.bit_rate ?? 0) - (a.bit_rate ?? 0));
    videoUrl = mp4s[0]?.url ?? null;
  }

  return { urls, type, videoUrl };
}
