import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tweets, tweetSearchMatches, searchQueries } from "@/db/schema";
import { eq, and, gte, lt, desc, sql, ilike } from "drizzle-orm";
import { searchRecent, resolveAuthor, resolveMedia, type TwitterSearchResponse } from "@/lib/twitter";
import { LAUNCH_VIDEO_SEED_QUERIES, LAUNCH_AUTHOR_BLACKLIST } from "@/lib/constants";
import { scoreLaunchRelevance, LAUNCH_RELEVANCE_THRESHOLD } from "@/lib/launch-relevance";
import { parseRawQuery } from "@/lib/query-parser";

async function getLaunchFallbackTweets(timeRange: string, limit: number) {
  const now = new Date();
  const fallbackWindowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const todayCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDayCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startTime = fallbackWindowStart.toISOString();

  const perQueryCount = 8;
  const deduped = new Map<string, {
    id: number;
    tweetId: string;
    authorId: string;
    authorUsername: string | null;
    authorDisplayName: string | null;
    authorProfileImageUrl: string | null;
    text: string;
    createdAt: Date;
    likeCount: number;
    retweetCount: number;
    replyCount: number;
    quoteCount: number;
    impressionCount: number;
    mediaUrls: string[] | null;
    mediaType: string | null;
    videoUrl: string | null;
    tweetUrl: string;
  }>();

  for (const seed of LAUNCH_VIDEO_SEED_QUERIES) {
    const parsed = parseRawQuery(seed.rawQuery);
    let response: TwitterSearchResponse;
    try {
      response = await searchRecent({
        query: parsed.apiQuery,
        max_results: perQueryCount,
        start_time: startTime,
      });
    } catch {
      continue;
    }

    for (const tweet of response.data ?? []) {
      if (tweet.public_metrics.like_count < parsed.minFavesThreshold) continue;
      if (scoreLaunchRelevance(tweet.text) < LAUNCH_RELEVANCE_THRESHOLD) continue;

      const author = resolveAuthor(tweet.author_id, response.includes);
      if (author && LAUNCH_AUTHOR_BLACKLIST.has(author.username.toLowerCase())) continue;

      const media = resolveMedia(tweet, response.includes);
      deduped.set(tweet.id, {
        id: -deduped.size - 1,
        tweetId: tweet.id,
        authorId: tweet.author_id,
        authorUsername: author?.username ?? null,
        authorDisplayName: author?.name ?? null,
        authorProfileImageUrl: author?.profile_image_url ?? null,
        text: tweet.text,
        createdAt: new Date(tweet.created_at),
        likeCount: tweet.public_metrics.like_count,
        retweetCount: tweet.public_metrics.retweet_count,
        replyCount: tweet.public_metrics.reply_count,
        quoteCount: tweet.public_metrics.quote_count,
        impressionCount: tweet.public_metrics.impression_count ?? 0,
        mediaUrls: media.urls,
        mediaType: media.type,
        videoUrl: media.videoUrl,
        tweetUrl: `https://x.com/${author?.username ?? "i"}/status/${tweet.id}`,
      });
    }

    if (deduped.size >= limit) break;
  }

  const filteredByRange = Array.from(deduped.values()).filter((tweet) => {
    if (timeRange === "today") return tweet.createdAt >= todayCutoff;
    if (timeRange === "7days") return tweet.createdAt >= sevenDayCutoff;
    return true;
  });

  const fallbackTweets = filteredByRange
    .sort((a, b) => {
      if (timeRange === "today") {
        if (b.createdAt.getTime() !== a.createdAt.getTime()) {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }
        return b.likeCount - a.likeCount;
      }
      if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, limit);

  return {
    tweets: fallbackTweets,
    total: fallbackTweets.length,
    hasMore: false,
    fallback: true,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? "launch_videos";
    const timeRange = searchParams.get("timeRange") ?? "today";
    const authorHandle = searchParams.get("authorHandle");
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const sortBy = searchParams.get("sortBy") ?? "created_at";
    const search = searchParams.get("search");
    const minLikes = searchParams.get("minLikes");
    const engagement = searchParams.get("engagement");

    const conditions: ReturnType<typeof eq>[] = [
      eq(
        searchQueries.category,
        category as "launch_videos" | "memes" | "individual_user"
      ),
      eq(searchQueries.isActive, true),
      eq(tweets.isHidden, false),
    ];

    const now = new Date();
    if (timeRange === "today") {
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      conditions.push(gte(tweets.createdAt, twentyFourHoursAgo));
    } else if (timeRange === "7days") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      conditions.push(gte(tweets.createdAt, sevenDaysAgo));
    }

    if (engagement === "viral") {
      conditions.push(gte(tweets.likeCount, 500));
    } else if (engagement === "flops") {
      conditions.push(lt(tweets.likeCount, 500));
    }

    if (authorHandle) {
      conditions.push(eq(tweets.authorUsername, authorHandle.toLowerCase()));
    }

    if (userId) {
      conditions.push(eq(searchQueries.userId, parseInt(userId)));
    }

    if (search) {
      conditions.push(ilike(tweets.text, `%${search}%`));
    }

    if (minLikes) {
      conditions.push(gte(tweets.likeCount, parseInt(minLikes)));
    }

    const orderColumn =
      sortBy === "like_count" ? desc(tweets.likeCount) : desc(tweets.createdAt);

    const matchedIds = db
      .selectDistinct({ id: tweets.id })
      .from(tweets)
      .innerJoin(tweetSearchMatches, eq(tweets.id, tweetSearchMatches.tweetId))
      .innerJoin(
        searchQueries,
        eq(tweetSearchMatches.searchQueryId, searchQueries.id)
      )
      .where(and(...conditions))
      .as("matched");

    const results = await db
      .select({
        id: tweets.id,
        tweetId: tweets.tweetId,
        authorId: tweets.authorId,
        authorUsername: tweets.authorUsername,
        authorDisplayName: tweets.authorDisplayName,
        authorProfileImageUrl: tweets.authorProfileImageUrl,
        text: tweets.text,
        createdAt: tweets.createdAt,
        likeCount: tweets.likeCount,
        retweetCount: tweets.retweetCount,
        replyCount: tweets.replyCount,
        quoteCount: tweets.quoteCount,
        impressionCount: tweets.impressionCount,
        mediaUrls: tweets.mediaUrls,
        mediaType: tweets.mediaType,
        videoUrl: tweets.videoUrl,
        tweetUrl: tweets.tweetUrl,
      })
      .from(tweets)
      .innerJoin(matchedIds, eq(tweets.id, matchedIds.id))
      .orderBy(orderColumn)
      .limit(limit)
      .offset((page - 1) * limit);

    const [{ count }] = await db
      .select({ count: sql<number>`count(distinct ${tweets.tweetId})` })
      .from(tweets)
      .innerJoin(tweetSearchMatches, eq(tweets.id, tweetSearchMatches.tweetId))
      .innerJoin(
        searchQueries,
        eq(tweetSearchMatches.searchQueryId, searchQueries.id)
      )
      .where(and(...conditions));

    const total = Number(count);

    if (
      category === "launch_videos" &&
      (timeRange === "today" || timeRange === "7days" || timeRange === "all") &&
      page === 1 &&
      total === 0
    ) {
      const fallback = await getLaunchFallbackTweets(timeRange, limit);
      return NextResponse.json({
        tweets: fallback.tweets,
        total: fallback.total,
        page,
        hasMore: fallback.hasMore,
        fallback: fallback.fallback,
        fallbackTimeRange: timeRange,
      });
    }

    return NextResponse.json({
      tweets: results,
      total,
      page,
      hasMore: page * limit < total,
    });
  } catch (error: unknown) {
    const err = error as Error & { cause?: Error };
    const message = err.message ?? String(error);
    const cause = err.cause?.message ?? String(err.cause ?? "");
    return NextResponse.json(
      { error: message, cause, dbUrl: process.env.DATABASE_URL?.replace(/:[^@]+@/, ':***@') },
      { status: 500 }
    );
  }
}
