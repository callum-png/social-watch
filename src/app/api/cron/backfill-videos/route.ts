import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tweets } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { lookupTweets, resolveMedia } from "@/lib/twitter";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all video tweets missing videoUrl
  const videoTweets = await db
    .select({ id: tweets.id, tweetId: tweets.tweetId })
    .from(tweets)
    .where(and(eq(tweets.mediaType, "video"), isNull(tweets.videoUrl)));

  if (videoTweets.length === 0) {
    return NextResponse.json({ message: "No video tweets to backfill", updated: 0 });
  }

  let updated = 0;
  const errors: string[] = [];

  // Twitter API allows up to 100 IDs per lookup
  for (let i = 0; i < videoTweets.length; i += 100) {
    const batch = videoTweets.slice(i, i + 100);
    const tweetIds = batch.map((t) => t.tweetId);

    try {
      const response = await lookupTweets(tweetIds);

      for (const tweet of response.data ?? []) {
        const media = resolveMedia(tweet, response.includes);
        if (media.videoUrl) {
          const dbTweet = batch.find((t) => t.tweetId === tweet.id);
          if (dbTweet) {
            await db
              .update(tweets)
              .set({ videoUrl: media.videoUrl })
              .where(eq(tweets.id, dbTweet.id));
            updated++;
          }
        }
      }
    } catch (error) {
      errors.push(
        `Batch ${i}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return NextResponse.json({
    total: videoTweets.length,
    updated,
    errors,
  });
}
