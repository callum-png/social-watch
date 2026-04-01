import {
  pgTable,
  pgEnum,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ─── Enums ───

export const userStatusEnum = pgEnum("user_status", [
  "pending",
  "approved",
  "rejected",
  "suspended",
]);

export const searchCategoryEnum = pgEnum("search_category", [
  "launch_videos",
  "memes",
  "individual_user",
]);

// ─── Users ───

export const users = pgTable(
  "users",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    twitterHandle: varchar("twitter_handle", { length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 128 }),
    status: userStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    approvedAt: timestamp("approved_at"),
    adminNotes: text("admin_notes"),
  },
  (table) => [uniqueIndex("twitter_handle_idx").on(table.twitterHandle)]
);

// ─── Watched Accounts ───

export const watchedAccounts = pgTable(
  "watched_accounts",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    twitterHandle: varchar("twitter_handle", { length: 64 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("watched_user_idx").on(table.userId),
    uniqueIndex("watched_unique_idx").on(table.userId, table.twitterHandle),
  ]
);

// ─── Search Queries ───

export const searchQueries = pgTable(
  "search_queries",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    category: searchCategoryEnum("category").notNull(),
    label: varchar("label", { length: 256 }).notNull(),
    rawQuery: text("raw_query").notNull(),
    apiQuery: text("api_query").notNull(),
    minFavesThreshold: integer("min_faves_threshold").notNull().default(0),
    hasDynamicDate: boolean("has_dynamic_date").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    lastSinceId: varchar("last_since_id", { length: 64 }),
    lastRunAt: timestamp("last_run_at"),
    lastResultCount: integer("last_result_count").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("sq_user_idx").on(table.userId),
    index("sq_category_idx").on(table.category),
    index("sq_active_idx").on(table.isActive),
  ]
);

// ─── Tweets ───

export const tweets = pgTable(
  "tweets",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    tweetId: varchar("tweet_id", { length: 64 }).notNull(),
    authorId: varchar("author_id", { length: 64 }).notNull(),
    authorUsername: varchar("author_username", { length: 64 }),
    authorDisplayName: varchar("author_display_name", { length: 256 }),
    authorProfileImageUrl: text("author_profile_image_url"),
    text: text("text").notNull(),
    createdAt: timestamp("created_at").notNull(),
    likeCount: integer("like_count").notNull().default(0),
    retweetCount: integer("retweet_count").notNull().default(0),
    replyCount: integer("reply_count").notNull().default(0),
    quoteCount: integer("quote_count").notNull().default(0),
    impressionCount: integer("impression_count").default(0),
    mediaUrls: jsonb("media_urls").$type<string[]>().default([]),
    mediaType: varchar("media_type", { length: 32 }),
    videoUrl: text("video_url"),
    tweetUrl: text("tweet_url").notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
    isHidden: boolean("is_hidden").notNull().default(false),
  },
  (table) => [
    uniqueIndex("tweet_id_idx").on(table.tweetId),
    index("tweet_created_idx").on(table.createdAt),
    index("tweet_author_idx").on(table.authorUsername),
    index("tweet_likes_idx").on(table.likeCount),
  ]
);

// ─── Tweet <-> Search Query join ───

export const tweetSearchMatches = pgTable(
  "tweet_search_matches",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    tweetId: integer("tweet_id")
      .references(() => tweets.id, { onDelete: "cascade" })
      .notNull(),
    searchQueryId: integer("search_query_id")
      .references(() => searchQueries.id, { onDelete: "cascade" })
      .notNull(),
    matchedAt: timestamp("matched_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("tweet_search_unique_idx").on(
      table.tweetId,
      table.searchQueryId
    ),
    index("tsm_tweet_idx").on(table.tweetId),
    index("tsm_query_idx").on(table.searchQueryId),
  ]
);

// ─── Notifications ───

export const notifications = pgTable(
  "notifications",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    type: varchar("type", { length: 64 }).notNull(),
    title: varchar("title", { length: 256 }).notNull(),
    message: text("message"),
    referenceId: integer("reference_id"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notif_read_idx").on(table.isRead),
    index("notif_created_idx").on(table.createdAt),
  ]
);

// ─── Campaign Reports ───

export const campaignReports = pgTable(
  "campaign_reports",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    slug: varchar("slug", { length: 256 }).notNull(),
    title: varchar("title", { length: 512 }).notNull(),
    brandName: varchar("brand_name", { length: 256 }).notNull(),
    founderHandle: varchar("founder_handle", { length: 128 }),
    searchTerms: jsonb("search_terms").$type<string[]>().default([]),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date"),
    isPublished: boolean("is_published").notNull().default(true),
    lastFetchedAt: timestamp("last_fetched_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("campaign_slug_idx").on(table.slug),
    index("campaign_created_idx").on(table.createdAt),
  ]
);

export const campaignMentions = pgTable(
  "campaign_mentions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    reportId: integer("report_id")
      .references(() => campaignReports.id, { onDelete: "cascade" })
      .notNull(),
    tweetId: varchar("tweet_id", { length: 64 }).notNull(),
    authorUsername: varchar("author_username", { length: 64 }),
    authorDisplayName: varchar("author_display_name", { length: 256 }),
    authorProfileImageUrl: text("author_profile_image_url"),
    text: text("text").notNull(),
    tweetUrl: text("tweet_url").notNull(),
    createdAt: timestamp("created_at").notNull(),
    likeCount: integer("like_count").notNull().default(0),
    retweetCount: integer("retweet_count").notNull().default(0),
    replyCount: integer("reply_count").notNull().default(0),
    quoteCount: integer("quote_count").notNull().default(0),
    impressionCount: integer("impression_count").default(0),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("cm_report_tweet_idx").on(table.reportId, table.tweetId),
    index("cm_report_idx").on(table.reportId),
    index("cm_likes_idx").on(table.likeCount),
  ]
);

export const campaignCreatorPosts = pgTable(
  "campaign_creator_posts",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    reportId: integer("report_id")
      .references(() => campaignReports.id, { onDelete: "cascade" })
      .notNull(),
    platform: varchar("platform", { length: 32 }).notNull(), // twitter | linkedin
    url: text("url").notNull(),
    tweetId: varchar("tweet_id", { length: 64 }), // extracted from twitter URLs
    authorName: varchar("author_name", { length: 256 }),
    authorHandle: varchar("author_handle", { length: 128 }),
    metrics: jsonb("metrics").$type<{
      likeCount?: number;
      retweetCount?: number;
      replyCount?: number;
      quoteCount?: number;
      impressionCount?: number;
    }>(),
    text: text("text"),
    screenshotUrl: text("screenshot_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ccp_report_idx").on(table.reportId),
    index("ccp_sort_idx").on(table.reportId, table.sortOrder),
  ]
);

// ─── Saved References (Slack bot) ───

export const savedReferences = pgTable(
  "saved_references",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    url: text("url").notNull().unique(),
    platform: text("platform").notNull(),
    sharedBy: text("shared_by").notNull(),
    slackMessageTs: text("slack_message_ts"),
    slackChannelId: text("slack_channel_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

export const savedReferenceBrands = pgTable(
  "saved_reference_brands",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    referenceId: integer("reference_id")
      .references(() => savedReferences.id, { onDelete: "cascade" })
      .notNull(),
    foreplayBoardId: text("foreplay_board_id").notNull(),
    foreplayBoardName: text("foreplay_board_name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ref_brand_unique_idx").on(table.referenceId, table.foreplayBoardId),
    index("ref_brand_ref_idx").on(table.referenceId),
  ]
);

export const clients = pgTable("clients", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Cron Run Log ───

export const cronRuns = pgTable("cron_runs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  queriesExecuted: integer("queries_executed").default(0),
  tweetsFound: integer("tweets_found").default(0),
  tweetsStored: integer("tweets_stored").default(0),
  errors: jsonb("errors").$type<string[]>().default([]),
  status: varchar("status", { length: 32 }).notNull().default("running"),
});
