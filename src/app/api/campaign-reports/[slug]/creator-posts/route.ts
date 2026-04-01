import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaignReports, campaignCreatorPosts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  extractTweetId,
  detectPlatform,
  fetchCreatorTweetMetrics,
} from "@/lib/campaign-report";

async function resolveReportId(slug: string): Promise<number | null> {
  const [report] = await db
    .select({ id: campaignReports.id })
    .from(campaignReports)
    .where(eq(campaignReports.slug, slug))
    .limit(1);
  return report?.id ?? null;
}

// POST /api/campaign-reports/[slug]/creator-posts — add a single creator post
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const reportId = await resolveReportId(slug);
    if (!reportId) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const body = await request.json();
    const { url } = body as { url: string };

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const platform = detectPlatform(url);
    if (!platform) {
      return NextResponse.json(
        { error: "URL must be a Twitter/X or LinkedIn link" },
        { status: 400 }
      );
    }

    // Duplicate check — same URL in this report
    const existing = await db
      .select({ id: campaignCreatorPosts.id })
      .from(campaignCreatorPosts)
      .where(
        and(
          eq(campaignCreatorPosts.reportId, reportId),
          eq(campaignCreatorPosts.url, url)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "This post is already in the report", duplicate: true },
        { status: 409 }
      );
    }

    let authorName: string | null = null;
    let authorHandle: string | null = null;
    let metrics: {
      likeCount?: number;
      retweetCount?: number;
      replyCount?: number;
      quoteCount?: number;
      impressionCount?: number;
    } | null = null;
    let text: string | null = null;
    let tweetId: string | null = null;
    let screenshotUrl: string | null = null;

    if (platform === "twitter") {
      tweetId = extractTweetId(url);
      if (tweetId) {
        // Also check duplicate by tweetId
        const existingTweet = await db
          .select({ id: campaignCreatorPosts.id })
          .from(campaignCreatorPosts)
          .where(
            and(
              eq(campaignCreatorPosts.reportId, reportId),
              eq(campaignCreatorPosts.tweetId, tweetId)
            )
          )
          .limit(1);

        if (existingTweet.length > 0) {
          return NextResponse.json(
            { error: "This tweet is already in the report", duplicate: true },
            { status: 409 }
          );
        }

        const data = await fetchCreatorTweetMetrics([tweetId]);
        const tweetData = data.get(tweetId);
        if (tweetData) {
          authorName = tweetData.authorName;
          authorHandle = tweetData.authorHandle;
          metrics = tweetData.metrics;
          text = tweetData.text;
          screenshotUrl = tweetData.mediaUrl;
        }
      }
    }

    // Get max sort order
    const allPosts = await db
      .select({ sortOrder: campaignCreatorPosts.sortOrder })
      .from(campaignCreatorPosts)
      .where(eq(campaignCreatorPosts.reportId, reportId))
      .orderBy(campaignCreatorPosts.sortOrder);
    const maxSort =
      allPosts.length > 0
        ? allPosts[allPosts.length - 1].sortOrder
        : -1;

    const [post] = await db
      .insert(campaignCreatorPosts)
      .values({
        reportId,
        platform,
        url,
        tweetId,
        authorName,
        authorHandle,
        metrics,
        text,
        screenshotUrl,
        sortOrder: maxSort + 1,
      })
      .returning();

    return NextResponse.json({ post });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/campaign-reports/[slug]/creator-posts — bulk import posts (from TSV / URL list)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const reportId = await resolveReportId(slug);
    if (!reportId) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const body = await request.json();
    const posts = body.posts as Array<{
      url: string;
      likes?: number | null;
      comments?: number | null;
      retweets?: number | null;
      views?: number | null;
      screenshotUrl?: string | null;
    }>;

    if (!posts?.length) {
      return NextResponse.json(
        { error: "No posts provided" },
        { status: 400 }
      );
    }

    // Load existing posts for duplicate checking
    const existingPosts = await db
      .select({
        url: campaignCreatorPosts.url,
        tweetId: campaignCreatorPosts.tweetId,
        sortOrder: campaignCreatorPosts.sortOrder,
      })
      .from(campaignCreatorPosts)
      .where(eq(campaignCreatorPosts.reportId, reportId));

    const existingUrls = new Set(existingPosts.map((p) => p.url));
    const existingTweetIds = new Set(
      existingPosts.map((p) => p.tweetId).filter(Boolean)
    );
    let maxSort =
      existingPosts.length > 0
        ? Math.max(...existingPosts.map((p) => p.sortOrder))
        : -1;

    // Deduplicate within the batch too
    const seenUrls = new Set<string>();
    const validPosts: typeof posts = [];
    for (const p of posts) {
      if (!p.url || seenUrls.has(p.url) || existingUrls.has(p.url)) continue;
      const platform = detectPlatform(p.url);
      if (!platform) continue;
      seenUrls.add(p.url);
      validPosts.push(p);
    }

    // Collect Twitter tweet IDs for batch lookup
    const twitterPosts: { index: number; tweetId: string; url: string }[] = [];
    for (let i = 0; i < validPosts.length; i++) {
      const p = validPosts[i];
      const platform = detectPlatform(p.url);
      if (platform === "twitter") {
        const tid = extractTweetId(p.url);
        if (tid) {
          if (existingTweetIds.has(tid)) continue;
          twitterPosts.push({ index: i, tweetId: tid, url: p.url });
        }
      }
    }

    // Batch fetch Twitter metrics + media
    const tweetIds = twitterPosts.map((t) => t.tweetId);
    const tweetData =
      tweetIds.length > 0
        ? await fetchCreatorTweetMetrics(tweetIds)
        : new Map();

    let added = 0;
    let duplicates = 0;
    const insertedPosts = [];

    for (const p of validPosts) {
      const platform = detectPlatform(p.url)!;
      const tid = platform === "twitter" ? extractTweetId(p.url) : null;

      if (tid && existingTweetIds.has(tid)) {
        duplicates++;
        continue;
      }

      let authorName: string | null = null;
      let authorHandle: string | null = null;
      let metrics: Record<string, number> | null = null;
      let text: string | null = null;
      let screenshotUrl = p.screenshotUrl ?? null;

      if (tid && tweetData.has(tid)) {
        const td = tweetData.get(tid)!;
        authorName = td.authorName;
        authorHandle = td.authorHandle;
        text = td.text;
        screenshotUrl = td.mediaUrl ?? screenshotUrl;
        metrics = td.metrics;
      } else if (
        p.likes != null ||
        p.views != null ||
        p.retweets != null ||
        p.comments != null
      ) {
        metrics = {};
        if (p.likes != null) metrics.likeCount = p.likes;
        if (p.comments != null) metrics.replyCount = p.comments;
        if (p.retweets != null) metrics.retweetCount = p.retweets;
        if (p.views != null) metrics.impressionCount = p.views;
      }

      maxSort++;
      const [post] = await db
        .insert(campaignCreatorPosts)
        .values({
          reportId,
          platform,
          url: p.url,
          tweetId: tid,
          authorName,
          authorHandle,
          metrics,
          text,
          screenshotUrl,
          sortOrder: maxSort,
        })
        .returning();

      insertedPosts.push(post);
      added++;
    }

    return NextResponse.json({
      added,
      duplicates: posts.length - validPosts.length + duplicates,
      posts: insertedPosts,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/campaign-reports/[slug]/creator-posts?postId=123
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const reportId = await resolveReportId(slug);
    if (!reportId) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const postId = parseInt(searchParams.get("postId") ?? "");

    if (isNaN(postId)) {
      return NextResponse.json(
        { error: "Invalid post ID" },
        { status: 400 }
      );
    }

    await db
      .delete(campaignCreatorPosts)
      .where(
        and(
          eq(campaignCreatorPosts.id, postId),
          eq(campaignCreatorPosts.reportId, reportId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
