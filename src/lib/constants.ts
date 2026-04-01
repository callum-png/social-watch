export const MEME_PAGE_ACCOUNTS = [
  "InternetH0F",
  "interesting_aIl",
  "NoContextHumans",
  "chasedownleads",
  "the_p_god",
  "compliantvc",
  "eastvillageguy",
  "BacardiCapital",
  "HighyieldHarry",
  "RampCapitalLLC",
  "therabbithole",
  "tiktokinvestors",
  "unusual_whales",
  "litcapital",
  "BoringBiz_",
  "alifarhat79",
  "TiffanyFong",
  "alphafox",
  "greg16676935420",
  "historyinmemes",
  "wallstreetmav",
];

export const MEME_SEED_QUERIES = MEME_PAGE_ACCOUNTS.map((handle) => ({
  label: `@${handle} (10000+ likes)`,
  rawQuery: `from:${handle} min_faves:10000 -is:retweet`,
}));

// Accounts to never surface in launch results
// Politicians, sports, news orgs, theme/aggregator pages
export const LAUNCH_AUTHOR_BLACKLIST = new Set([
  // Politicians / government
  "mkratsios47",
  // Sports
  "nbsportug",
  "espn",
  "sportscenter",
  "bleacherreport",
  // News orgs
  "wsj",
  "nytimes",
  "reuters",
  "bloomberg",
  "techcrunch",
  "theverge",
  // Theme / aggregator pages
  "fi_investindia",
  "globaldesire4_",
  "iscienceluvr",
  // Anime / vtuber / fandom
  "holo_dreams_en",
  "haborymx",
]);

export const LAUNCH_VIDEO_SEED_QUERIES = [
  // Specific queries — low volume, 300 results covers days
  {
    label: '"Introducing" + "AI" (200+ likes)',
    rawQuery: '"Introducing" "AI" lang:en -is:retweet -is:reply min_faves:200',
  },
  {
    label: "Raised Series/Seed (100+ likes)",
    rawQuery:
      '"raised" ("Series" OR "seed round" OR "pre-seed") lang:en -is:retweet -is:reply min_faves:100',
  },
  {
    label: "Raised millions/billions (200+ likes)",
    rawQuery:
      '"raised" ("million" OR "billion") lang:en -is:retweet -is:reply min_faves:200',
  },
  {
    label: "Raised $XM/$XB (200+ likes)",
    rawQuery: '"raised $" lang:en -is:retweet -is:reply min_faves:200',
  },
  {
    label: '"Introducing" + CTA (100+ likes)',
    rawQuery:
      '"Introducing" ("comment" OR "RT" OR "repost") lang:en -is:retweet -is:reply min_faves:100',
  },
  {
    label: '"the first" + "AI" (200+ likes)',
    rawQuery: '"the first" "AI" lang:en -is:retweet -is:reply min_faves:200',
  },
  {
    label: '"world\'s first" (100+ likes)',
    rawQuery: '"world\'s first" lang:en -is:retweet -is:reply min_faves:100',
  },
  {
    label: "Unveiling (200+ likes)",
    rawQuery: '"unveiling" lang:en -is:retweet -is:reply min_faves:200',
  },
  {
    label: '"Introducing" + launched/shipped (200+ likes)',
    rawQuery:
      '"Introducing" ("launched" OR "shipped" OR "live" OR "now available") lang:en -is:retweet -is:reply min_faves:200',
  },
  // "Introducing" + agent/model names (catches AI agent launches without literal "AI")
  {
    label: '"Introducing" + agent/model (100+ likes)',
    rawQuery:
      '"Introducing" ("agent" OR "agents" OR "Gemini" OR "GPT" OR "Claude") lang:en -is:retweet -is:reply min_faves:100',
  },
  // Broader catch-all — high volume, covers last few hours only
  {
    label: '"Introducing" catch-all (500+ likes)',
    rawQuery: '"Introducing" has:media lang:en -is:retweet -is:reply min_faves:500',
  },
];
