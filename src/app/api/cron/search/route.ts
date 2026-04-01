import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  searchQueries,
  tweets,
  tweetSearchMatches,
  cronRuns,
  users,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { buildRuntimeQuery } from "@/lib/query-parser";
import {
  scoreLaunchRelevance,
  LAUNCH_RELEVANCE_THRESHOLD,
} from "@/lib/launch-relevance";
import {
  searchRecent,
  resolveAuthor,
  resolveMedia,
  type TwitterSearchResponse,
} from "@/lib/twitter";
import { LAUNCH_AUTHOR_BLACKLIST } from "@/lib/constants";

// Vercel Cron sends GET requests
export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Create cron run log
  const [cronRun] = await db
    .insert(cronRuns)
    .values({ status: "running" })
    .returning();

  let totalFound = 0;
  let totalStored = 0;
  const errors: string[] = [];

  try {
    // Fetch all active search queries
    // Global queries (userId is null) are always included
    // User-specific queries only if the user is approved
    const globalQueries = await db
      .select()
      .from(searchQueries)
      .where(
        and(
          eq(searchQueries.isActive, true),
          // We need to handle null userId separately
        )
      );

    // Filter: include global queries + queries for approved users
    const approvedUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.status, "approved"));
    const approvedUserIds = new Set(approvedUsers.map((u) => u.id));

    const activeQueries = globalQueries.filter(
      (q) => q.userId === null || approvedUserIds.has(q.userId)
    );

    // Filter by category if specified (?category=memes or ?category=launches)
    const categoryParam = request.nextUrl.searchParams.get("category");
    const memesEnabled = process.env.ENABLE_MEME_SEARCHES === "true";
    let queriesToRun = activeQueries;
    if (categoryParam === "memes") {
      queriesToRun = activeQueries.filter((q) => q.category === "memes");
    } else if (categoryParam === "launches") {
      queriesToRun = activeQueries.filter((q) => q.category !== "memes");
    }

    if (!memesEnabled) {
      queriesToRun = queriesToRun.filter((q) => q.category !== "memes");
    }

    let rateLimited = false;

    for (const query of queriesToRun) {
      if (rateLimited) {
        errors.push(`Query ${query.id} (${query.label}): Skipped - API quota exhausted`);
        continue;
      }

      try {
        // Build runtime query
        const { query: runtimeQuery, startTime } = buildRuntimeQuery(
          query.apiQuery,
          query.hasDynamicDate
        );

        // Always fetch max 100 per call to maximize value of each API request.
        // Launch queries: paginate up to 5 pages (500 tweets), no since_id
        // so viral tweets from days ago get caught.
        const isLaunch = query.category === "launch_videos";
        const MAX_LAUNCH_PAGES = 5;

        const response: TwitterSearchResponse = await searchRecent({
          query: runtimeQuery,
          max_results: 100,
          since_id: isLaunch ? undefined : (query.lastSinceId ?? undefined),
          start_time: startTime,
        });

        const allTweets = response.data ?? [];

        // Paginate for launch queries to catch viral tweets from days ago
        if (isLaunch && response.meta?.next_token) {
          let nextToken: string | undefined = response.meta.next_token;
          let pageCount = 1;
          while (nextToken && pageCount < MAX_LAUNCH_PAGES) {
            const page = await searchRecent({
              query: runtimeQuery,
              max_results: 100,
              start_time: startTime,
              next_token: nextToken,
            });
            if (page.data) allTweets.push(...page.data);
            // Merge includes (users, media) from each page
            if (page.includes?.users) {
              response.includes = response.includes ?? {};
              response.includes.users = response.includes.users ?? [];
              response.includes.users.push(...page.includes.users);
            }
            if (page.includes?.media) {
              response.includes = response.includes ?? {};
              response.includes.media = response.includes.media ?? [];
              response.includes.media.push(...page.includes.media);
            }
            nextToken = page.meta?.next_token;
            pageCount++;
          }
        }

        // Track newestId from ALL results (before filtering) so since_id advances
        // (only used for non-launch queries)
        let newestId: string | null = null;
        if (!isLaunch) {
          for (const t of allTweets) {
            if (!newestId || t.id > newestId) newestId = t.id;
          }
        }

        // Post-query filtering for min_faves
        let matchedTweets = allTweets;
        if (query.minFavesThreshold > 0) {
          matchedTweets = matchedTweets.filter(
            (t) => t.public_metrics.like_count >= query.minFavesThreshold
          );
        }

        // Relevance scoring for launch_videos
        if (query.category === "launch_videos") {
          matchedTweets = matchedTweets.filter(
            (t) => scoreLaunchRelevance(t.text) >= LAUNCH_RELEVANCE_THRESHOLD
          );
          // Filter out blacklisted authors (news orgs, politicians, theme pages)
          matchedTweets = matchedTweets.filter((t) => {
            const author = resolveAuthor(t.author_id, response.includes);
            return !author || !LAUNCH_AUTHOR_BLACKLIST.has(author.username.toLowerCase());
          });
        }

        for (const tweet of matchedTweets) {
          totalFound++;

          // Check if tweet already exists
          const existing = await db
            .select({ id: tweets.id })
            .from(tweets)
            .where(eq(tweets.tweetId, tweet.id))
            .limit(1);

          let tweetDbId: number;

          if (existing.length > 0) {
            tweetDbId = existing[0].id;
            // Update engagement metrics
            await db
              .update(tweets)
              .set({
                likeCount: tweet.public_metrics.like_count,
                retweetCount: tweet.public_metrics.retweet_count,
                replyCount: tweet.public_metrics.reply_count,
                quoteCount: tweet.public_metrics.quote_count,
                impressionCount: tweet.public_metrics.impression_count ?? 0,
              })
              .where(eq(tweets.id, tweetDbId));
          } else {
            const author = resolveAuthor(tweet.author_id, response.includes);
            const media = resolveMedia(tweet, response.includes);

            const [inserted] = await db
              .insert(tweets)
              .values({
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
              })
              .returning({ id: tweets.id });
            tweetDbId = inserted.id;
            totalStored++;
          }

          // Link to search query (dedup via unique index)
          try {
            await db.insert(tweetSearchMatches).values({
              tweetId: tweetDbId,
              searchQueryId: query.id,
            });
          } catch {
            // Unique constraint violation - already linked, ignore
          }

        }

        // Update query's last run state
        await db
          .update(searchQueries)
          .set({
            lastSinceId: newestId ?? query.lastSinceId,
            lastRunAt: new Date(),
            lastResultCount: matchedTweets.length,
            updatedAt: new Date(),
          })
          .where(eq(searchQueries.id, query.id));
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Unknown error";

        // If since_id is stale, clear it so the next run works
        if (msg.includes("since_id") && msg.includes("must be a tweet id created after")) {
          await db
            .update(searchQueries)
            .set({ lastSinceId: null, updatedAt: new Date() })
            .where(eq(searchQueries.id, query.id));
          errors.push(`Query ${query.id} (${query.label}): Stale since_id cleared — will retry next run`);
        } else {
          errors.push(`Query ${query.id} (${query.label}): ${msg}`);
        }

        if (msg.includes("CreditsDepleted") || msg.includes("429") || msg.includes("402")) {
          rateLimited = true;
        }
      }
    }

    // Update cron run log
    await db
      .update(cronRuns)
      .set({
        completedAt: new Date(),
        queriesExecuted: queriesToRun.length,
        tweetsFound: totalFound,
        tweetsStored: totalStored,
        errors,
        status: errors.length > 0 ? "completed_with_errors" : "completed",
      })
      .where(eq(cronRuns.id, cronRun.id));

    return NextResponse.json({
      queriesExecuted: queriesToRun.length,
      totalFound,
      totalStored,
      errors,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await db
      .update(cronRuns)
      .set({
        completedAt: new Date(),
        errors: [msg],
        status: "failed",
      })
      .where(eq(cronRuns.id, cronRun.id));

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
