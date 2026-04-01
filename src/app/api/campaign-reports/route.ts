import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  campaignReports,
  campaignMentions,
  campaignCreatorPosts,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  fetchCampaignMentions,
  extractTweetId,
  fetchCreatorTweetMetrics,
} from "@/lib/campaign-report";

// GET /api/campaign-reports — list all reports (admin)
export async function GET() {
  try {
    const reports = await db
      .select()
      .from(campaignReports)
      .orderBy(desc(campaignReports.createdAt));

    return NextResponse.json({ reports });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/campaign-reports — create report + auto-fetch mentions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      slug,
      brandName,
      founderHandle,
      searchTerms,
      startDate,
      endDate,
      creatorPosts,
    } = body as {
      title: string;
      slug: string;
      brandName: string;
      founderHandle?: string;
      searchTerms?: string[];
      startDate: string;
      endDate?: string;
      creatorPosts?: {
        url: string;
        platform: "twitter" | "linkedin";
        likes: number | null;
        comments: number | null;
        retweets: number | null;
        views: number | null;
        sortOrder: number;
        screenshotUrl?: string | null;
      }[];
    };

    if (!title || !slug || !brandName || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields: title, slug, brandName, startDate" },
        { status: 400 }
      );
    }

    // Create the report
    const [report] = await db
      .insert(campaignReports)
      .values({
        title,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        brandName,
        founderHandle: founderHandle || null,
        searchTerms: searchTerms ?? [],
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
      })
      .returning();

    // Fetch social listening mentions from Twitter
    let mentionCount = 0;
    try {
      const mentions = await fetchCampaignMentions({
        brandName,
        founderHandle,
        searchTerms,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
      });

      if (mentions.length > 0) {
        await db.insert(campaignMentions).values(
          mentions.map((m) => ({
            reportId: report.id,
            tweetId: m.tweetId,
            authorUsername: m.authorUsername,
            authorDisplayName: m.authorDisplayName,
            authorProfileImageUrl: m.authorProfileImageUrl,
            text: m.text,
            tweetUrl: m.tweetUrl,
            createdAt: new Date(m.createdAt),
            likeCount: m.likeCount,
            retweetCount: m.retweetCount,
            replyCount: m.replyCount,
            quoteCount: m.quoteCount,
            impressionCount: m.impressionCount,
          }))
        );
        mentionCount = mentions.length;
      }

      // Update lastFetchedAt
      await db
        .update(campaignReports)
        .set({ lastFetchedAt: new Date() })
        .where(eq(campaignReports.id, report.id));
    } catch (err) {
      console.error("Failed to fetch mentions:", err);
      // Don't fail the whole request — report is still created
    }

    // Process creator posts (from TSV paste with manual metrics)
    let creatorPostCount = 0;
    if (creatorPosts?.length) {
      // Collect Twitter IDs for batch lookup (author info + media thumbnails)
      const twitterIds: { index: number; tweetId: string }[] = [];
      for (let i = 0; i < creatorPosts.length; i++) {
        if (creatorPosts[i].platform === "twitter") {
          const tid = extractTweetId(creatorPosts[i].url);
          if (tid) twitterIds.push({ index: i, tweetId: tid });
        }
      }

      let tweetData = new Map<string, { text: string; authorName: string | null; authorHandle: string | null; mediaUrl: string | null; metrics: { likeCount: number; retweetCount: number; replyCount: number; quoteCount: number; impressionCount: number } }>();
      if (twitterIds.length > 0) {
        try {
          tweetData = await fetchCreatorTweetMetrics(twitterIds.map((t) => t.tweetId));
        } catch (err) {
          console.error("Failed to fetch creator tweet data:", err);
        }
      }

      const postValues = creatorPosts.map((p) => {
        const tid = p.platform === "twitter" ? extractTweetId(p.url) : null;
        const td = tid ? tweetData.get(tid) : undefined;

        return {
          reportId: report.id,
          platform: p.platform,
          url: p.url,
          tweetId: tid,
          authorName: td?.authorName ?? null,
          authorHandle: td?.authorHandle ?? null,
          metrics: td
            ? td.metrics
            : {
                likeCount: p.likes ?? undefined,
                retweetCount: p.retweets ?? undefined,
                replyCount: p.comments ?? undefined,
                impressionCount: p.views ?? undefined,
              },
          text: td?.text ?? null,
          screenshotUrl: td?.mediaUrl ?? p.screenshotUrl ?? null,
          sortOrder: p.sortOrder,
        };
      });

      if (postValues.length > 0) {
        await db.insert(campaignCreatorPosts).values(postValues);
        creatorPostCount = postValues.length;
      }
    }

    return NextResponse.json({
      report,
      mentionCount,
      creatorPostCount,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
