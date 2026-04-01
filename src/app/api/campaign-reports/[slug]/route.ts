import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  campaignReports,
  campaignMentions,
  campaignCreatorPosts,
} from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";

// GET /api/campaign-reports/[slug] — get full report data (public)
export async function GET(
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

    // Fetch mentions sorted by engagement
    const mentions = await db
      .select()
      .from(campaignMentions)
      .where(eq(campaignMentions.reportId, report.id))
      .orderBy(desc(campaignMentions.likeCount));

    // Fetch creator posts sorted by sortOrder
    const creatorPosts = await db
      .select()
      .from(campaignCreatorPosts)
      .where(eq(campaignCreatorPosts.reportId, report.id))
      .orderBy(asc(campaignCreatorPosts.sortOrder));

    // Calculate granular totals across all mentions
    const mentionTotals = mentions.reduce(
      (acc, m) => ({
        views: acc.views + (m.impressionCount ?? 0),
        likes: acc.likes + m.likeCount,
        retweets: acc.retweets + m.retweetCount,
        replies: acc.replies + m.replyCount,
        quotes: acc.quotes + m.quoteCount,
      }),
      { views: 0, likes: 0, retweets: 0, replies: 0, quotes: 0 }
    );

    // Add creator post metrics to totals
    for (const p of creatorPosts) {
      const m = p.metrics as {
        likeCount?: number;
        retweetCount?: number;
        replyCount?: number;
        quoteCount?: number;
        impressionCount?: number;
      } | null;
      if (!m) continue;
      mentionTotals.views += m.impressionCount ?? 0;
      mentionTotals.likes += m.likeCount ?? 0;
      mentionTotals.retweets += m.retweetCount ?? 0;
      mentionTotals.replies += m.replyCount ?? 0;
      mentionTotals.quotes += m.quoteCount ?? 0;
    }

    const uniqueAuthors = new Set(
      mentions.map((m) => m.authorUsername).filter(Boolean)
    ).size;

    // Per-platform stats for creator posts
    const platformStats = { twitter: { count: 0, views: 0, likes: 0, retweets: 0, replies: 0 }, linkedin: { count: 0, views: 0, likes: 0, retweets: 0, replies: 0 } };
    for (const p of creatorPosts) {
      const plat = p.platform === "linkedin" ? "linkedin" : "twitter";
      const m = p.metrics as { likeCount?: number; retweetCount?: number; replyCount?: number; quoteCount?: number; impressionCount?: number } | null;
      platformStats[plat].count++;
      if (m) {
        platformStats[plat].views += m.impressionCount ?? 0;
        platformStats[plat].likes += m.likeCount ?? 0;
        platformStats[plat].retweets += m.retweetCount ?? 0;
        platformStats[plat].replies += m.replyCount ?? 0;
      }
    }

    return NextResponse.json({
      report,
      mentions,
      creatorPosts,
      stats: {
        totalMentions: mentions.length,
        totalViews: mentionTotals.views,
        totalLikes: mentionTotals.likes,
        totalRetweets: mentionTotals.retweets,
        totalReplies: mentionTotals.replies,
        totalEngagement:
          mentionTotals.likes +
          mentionTotals.retweets +
          mentionTotals.replies +
          mentionTotals.quotes,
        uniqueAuthors,
        creatorPostCount: creatorPosts.length,
        platformStats,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/campaign-reports/[slug] — delete report (also used by id, slug doubles)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Try as slug first
    const [report] = await db
      .select({ id: campaignReports.id })
      .from(campaignReports)
      .where(eq(campaignReports.slug, slug))
      .limit(1);

    if (!report) {
      // Try as numeric ID
      const id = parseInt(slug);
      if (!isNaN(id)) {
        await db
          .delete(campaignReports)
          .where(eq(campaignReports.id, id));
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    await db
      .delete(campaignReports)
      .where(eq(campaignReports.id, report.id));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
