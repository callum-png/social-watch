import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { searchQueries } from "./schema";
import { LAUNCH_VIDEO_SEED_QUERIES, MEME_SEED_QUERIES } from "../lib/constants";
import { parseRawQuery } from "../lib/query-parser";

async function seed() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });
  const db = drizzle(sql);

  console.log("Seeding launch video queries...");

  for (const q of LAUNCH_VIDEO_SEED_QUERIES) {
    const parsed = parseRawQuery(q.rawQuery);
    await db.insert(searchQueries).values({
      userId: null,
      category: "launch_videos",
      label: q.label,
      rawQuery: q.rawQuery,
      apiQuery: parsed.apiQuery,
      minFavesThreshold: parsed.minFavesThreshold,
      hasDynamicDate: parsed.hasDynamicDate,
      isActive: true,
    });
    console.log(`  Seeded: ${q.label}`);
  }

  console.log("Seeding meme page queries...");

  for (const q of MEME_SEED_QUERIES) {
    const parsed = parseRawQuery(q.rawQuery);
    await db.insert(searchQueries).values({
      userId: null,
      category: "memes",
      label: q.label,
      rawQuery: q.rawQuery,
      apiQuery: parsed.apiQuery,
      minFavesThreshold: parsed.minFavesThreshold,
      hasDynamicDate: parsed.hasDynamicDate,
      isActive: true,
    });
    console.log(`  Seeded: ${q.label}`);
  }

  console.log("Done seeding.");
  await sql.end();
}

seed().catch(console.error);
