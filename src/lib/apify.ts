const APIFY_TOKEN = process.env.APIFY_TOKEN!;
const ACTOR_ID = process.env.APIFY_TWITTER_ACTOR ?? "scrape.badger~twitter-tweets-scraper";

export interface ApifyTweet {
  id: string;
  text: string;
  full_text?: string;
  created_at: string; // Twitter date format: "Wed Feb 18 18:02:57 +0000 2026"
  user_id: string;
  username: string;
  user_name: string;
  user_profile_image_url?: string;
  favorite_count: number;
  retweet_count: number;
  reply_count: number;
  quote_count: number;
  view_count?: number;
  media?: Array<{
    media_key: string;
    type: string;
    url?: string;
    preview_image_url?: string;
  }>;
}

async function runActor(input: object): Promise<ApifyTweet[]> {
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!runRes.ok) {
    const err = await runRes.json().catch(() => ({}));
    throw new Error(`Apify start failed: ${runRes.status} - ${JSON.stringify(err)}`);
  }

  const runData = await runRes.json();
  const runId: string = runData.data?.id;
  const datasetId: string = runData.data?.defaultDatasetId;
  if (!runId || !datasetId) throw new Error("No run ID/dataset returned from Apify");

  // Poll until done (max 3 minutes)
  const deadline = Date.now() + 3 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 4000));
    const st = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    const { data } = await st.json();
    if (data?.status === "SUCCEEDED") break;
    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(data?.status)) {
      throw new Error(`Apify run ${data.status} (runId: ${runId})`);
    }
  }

  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=500`
  );
  return itemsRes.json();
}

/**
 * Search tweets using Apify Advanced Search.
 * startTime / endTime should be ISO strings — date portion is extracted for the query filter.
 */
export async function searchTweets(
  query: string,
  options: { count?: number; startTime?: string; endTime?: string } = {}
): Promise<ApifyTweet[]> {
  const { count = 100, startTime, endTime } = options;

  let q = query;
  if (startTime) q += ` since:${startTime.split("T")[0]}`;
  if (endTime)   q += ` until:${endTime.split("T")[0]}`;

  return runActor({ mode: "Advanced Search", query: q, count });
}

/**
 * Fetch a single tweet by ID using Apify.
 */
export async function getTweetById(id: string): Promise<ApifyTweet | null> {
  try {
    const results = await runActor({ mode: "Get Tweet by ID", id });
    return results[0] ?? null;
  } catch {
    return null;
  }
}

/** Convert Twitter's date string to ISO format */
export function normalizeCreatedAt(twitterDate: string): string {
  return new Date(twitterDate).toISOString();
}
