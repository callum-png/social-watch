import { neon } from "@neondatabase/serverless";
import {
  scoreLaunchRelevance,
  LAUNCH_RELEVANCE_THRESHOLD,
} from "../lib/launch-relevance";
import { LAUNCH_AUTHOR_BLACKLIST } from "../lib/constants";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  const tweets = await sql`
    SELECT DISTINCT t.id, t.text, t.is_hidden, t.author_username
    FROM tweets t
    JOIN tweet_search_matches m ON t.id = m.tweet_id
    JOIN search_queries sq ON m.search_query_id = sq.id
    WHERE sq.category = 'launch_videos'
  `;

  let hidden = 0;
  let kept = 0;

  for (const t of tweets) {
    const username = (t.author_username as string)?.toLowerCase();
    const score = scoreLaunchRelevance(t.text as string);
    const blacklisted = LAUNCH_AUTHOR_BLACKLIST.has(username);

    if (score >= LAUNCH_RELEVANCE_THRESHOLD && !blacklisted) {
      // Good tweet — only HIDE bad ones, never unhide (respect manual hides)
      kept++;
      console.log(
        `  KEEP (score=${score}) @${t.author_username}: ${(t.text as string).substring(0, 80)}`
      );
    } else {
      if (!t.is_hidden) {
        await sql`UPDATE tweets SET is_hidden = true WHERE id = ${t.id}`;
        const reason = blacklisted ? "blacklisted" : `score=${score}`;
        console.log(
          `  HIDE (${reason}) @${t.author_username}: ${(t.text as string).substring(0, 80)}`
        );
      }
      hidden++;
    }
  }

  console.log(`\nKept ${kept} | Hidden ${hidden}`);
}

main().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
