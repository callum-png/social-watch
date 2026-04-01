import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import { searchQueries } from "./schema";
import { LAUNCH_VIDEO_SEED_QUERIES } from "../lib/constants";
import { parseRawQuery } from "../lib/query-parser";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  // 1. Deactivate old launch_videos queries
  const deactivated = await db
    .update(searchQueries)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(searchQueries.category, "launch_videos"),
        eq(searchQueries.isActive, true)
      )
    )
    .returning({ id: searchQueries.id, label: searchQueries.label });

  console.log(`Deactivated ${deactivated.length} old launch_videos queries:`);
  for (const q of deactivated) {
    console.log(`  - [${q.id}] ${q.label}`);
  }

  // 2. Insert new tighter queries
  console.log("\nInserting new queries:");
  for (const seed of LAUNCH_VIDEO_SEED_QUERIES) {
    const parsed = parseRawQuery(seed.rawQuery);

    const [inserted] = await db
      .insert(searchQueries)
      .values({
        userId: null,
        category: "launch_videos",
        label: seed.label,
        rawQuery: seed.rawQuery,
        apiQuery: parsed.apiQuery,
        minFavesThreshold: parsed.minFavesThreshold,
        hasDynamicDate: parsed.hasDynamicDate,
        isActive: true,
        lastSinceId: null,
      })
      .returning({ id: searchQueries.id, label: searchQueries.label });

    console.log(`  + [${inserted.id}] ${inserted.label}`);
  }

  console.log("\nDone! New queries will fetch fresh results on next cron run.");
}

main().catch((err) => {
  console.error("Reseed failed:", err);
  process.exit(1);
});
