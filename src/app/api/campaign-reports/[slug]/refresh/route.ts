import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaignReports, campaignMentions, campaignCreatorPosts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchCampaignMentions, fetchCreatorTweetMetrics } from "@/lib/campaign-report";

// POST /api/campaign-reports/[slug]/refresh — re-fetch social listening data
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const [report] = await db
      .select()
      .from(campaignReports)
      .where(eq(campaignReports.slug, slug))
      .limit(1);

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Fetch fresh mentions
    const mentions = await fetchCampaignMentions({
      brandName: report.brandName,
      founderHandle: report.founderHandle,
      searchTerms: report.searchTerms as string[],
      startDate: report.startDate,
      endDate: report.endDate,
    });

    // Upsert mentions (delete old, insert new)
    await db
      .delete(campaignMentions)
      .where(eq(campaignMentions.reportId, report.id));

    let mentionCount = 0;
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

    await db
      .update(campaignReports)
      .set({ lastFetchedAt: new Date(), updatedAt: new Date() })
      .where(eq(campaignReports.id, report.id));

    return NextResponse.json({ success: true, mentionCount });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/campaign-reports/[slug]/refresh — refresh creator post data (author info + media)
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const [report] = await db
      .select({ id: campaignReports.id })
      .from(campaignReports)
      .where(eq(campaignReports.slug, slug))
      .limit(1);

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Get all Twitter creator posts
    const posts = await db
      .select()
      .from(campaignCreatorPosts)
      .where(eq(campaignCreatorPosts.reportId, report.id));

    const twitterPosts = posts.filter(
      (p) => p.platform === "twitter" && p.tweetId
    );

    if (twitterPosts.length === 0) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    const tweetIds = twitterPosts.map((p) => p.tweetId!);
    const tweetData = await fetchCreatorTweetMetrics(tweetIds);

    let updated = 0;
    for (const post of twitterPosts) {
      const td = tweetData.get(post.tweetId!);
      if (!td) continue;

      await db
        .update(campaignCreatorPosts)
        .set({
          authorName: td.authorName,
          authorHandle: td.authorHandle,
          text: td.text,
          screenshotUrl: td.mediaUrl ?? post.screenshotUrl,
          metrics: td.metrics,
        })
        .where(eq(campaignCreatorPosts.id, post.id));
      updated++;
    }

    return NextResponse.json({ success: true, updated });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
