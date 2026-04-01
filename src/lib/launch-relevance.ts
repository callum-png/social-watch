// ── Positive signals ──────────────────────────────────────────────

// "Introducing Contra Payments" — must be "Introducing [ProductName]"
// Blocks: our/my/a/an/some/your + "the" UNLESS followed by "first" or "world" (gold standard patterns)
const INTRODUCING_RE = /\bintroducing\s+(?!our\s|my\s|a\s|an\s|some\s|your\s|the\s(?!first|world))\w/im;
// "has raised $80M", "raised $200M", "raised a $5.3M seed"
const RAISED_RE = /\braised\b.*\$[\d,.]+\s*(M|m|million|billion|B|b)\b/i;
// "unveiling SouljaAI", "announcing Rork"
const UNVEILING_RE = /\b(unveiling|announcing)\s+[A-Z]/i;
// "world's first AI CFO"
const WORLDS_FIRST_RE = /\bworld'?s\s+first\b/i;
// "the first payments platform that lets", "the first rapper to automate"
const THE_FIRST_RE = /\bthe\s+first\s+(?!time|one|thing|day|step|place|episode|book|person|quarter|half)\w+/i;
// "RT + Comment 'Slash'", "Comment 'PolyAI'", "Retweet + comment"
const CTA_RE = /\b(RT|retweet)\b.*\bcomment\b|\bcomment\b.*\b(RT|retweet)\b|\bcomment\s*["'][A-Z]/i;
// "Bold claim? Let me prove it", "bold claim, I know"
const BOLD_CLAIM_RE = /\b(bold\s+claim|let\s+me\s+prove)\b/i;
// "today we launched", "we just shipped", "now live"
const LAUNCHED_SHIPPED_RE = /\b(we\s+(just\s+)?(launched|shipped)|are\s+launching|we're\s+launching|now\s+live)\b/i;
// "$5.3M", "$80M", "100+ brands"
const DOLLAR_OR_NUMBERS_RE = /\$[\d,.]+[MmKkBb]|\b\d{2,}[\d,]*\+?\s*(brands?|users?|customers?|companies)/i;
// "AI Creative Director", "AI Agents", or major AI model names
const AI_TECH_RE = /\bAI\b|\bartificial\s+intelligence\b|\b(Gemini|GPT|ChatGPT|Claude|Llama|Mistral|LLM)\b/i;
// Tech/startup context — broad set of product/tech terms
const TECH_CONTEXT_RE = /\b(apps?|platform|software|API|SDK|beta|developer|startup|open[- ]?source|protocol|engine|dashboard|tools?|framework|model|agents?|bots?|web\s*app|mobile|iOS|Android|phone|browser|cloud|SaaS|B2B|fintech|hardware|device|sensor|chip|GPU|LED|data\s+platform|code|DeFi|AMM|smart\s*contract|algorithm|machine\s+learning|compute|server|database|integration|automation|workflow|pipeline|copilot|GitHub|extension|infrastructure|payments|UX|UI|UGC|ROAS|e-?commerce|e-?com|marketplace|analytics|product\s+launch|video|voice)\b/i;
// "to kill UGC ads", "to replace insurance brokers", "to burn Upwork"
const REPLACE_KILL_RE = /\bto\s+(k[i*]ll|replace|end|burn|destroy|disrupt)\b/i;
// "My last company, Opendoor", "I founded", "I dropped out"
const FOUNDER_STORY_RE = /\b(my\s+(new\s+|last\s+)?company|I\s+founded|I'?m\s+the\s+founder|we'?re\s+building|I\s+dropped\s+out)\b/i;
// Named VC firms / notable investors as social proof
const NAMED_INVESTORS_RE = /\b(Sequoia|Khosla|Y\s*Combinator|YC\b|a16z|Andreessen|Founders\s+Fund|NEA\b|Menlo\s+Ventures|Accel|Benchmark|Lightspeed|GV\b|Tiger\s+Global|SoftBank|Thiel|PayPal|Greylock|Nvidia)\b/i;
// "let me show you how", "let's see it in action", "how powerful"
const DEMO_PROMPT_RE = /\b(let\s+me\s+show\s+you|here'?s\s+how\s+it\s+works|let'?s\s+see\s+it|how\s+powerful|in\s+action)\b/i;

// ── Negative signals ─────────────────────────────────────────────

// NFT, crypto — noise
const CRYPTO_NFT_RE = /\bNFT\b|\bmint\b|\bairdrop\b|\bwhitelist\b|\b\$(SOL|ETH|BTC|MAFIA|BONK|PEPE)\b/i;
// Research papers: "New Meta Research", "our paper", "arxiv", "findings"
const RESEARCH_RE = /\b(research|paper|study|findings|arxiv|benchmark)\b/i;
// Game / feature updates: "Town Expansion", "new levels", "patch", "DLC"
const GAME_UPDATE_RE = /\b(expansion|patch\s+notes|DLC|new\s+levels?|unlockable|season\s+\d)\b/i;
// Feature updates for existing products: "This new feature", "this update brings"
const FEATURE_UPDATE_RE = /\b(new\s+feature|this\s+feature|feature\s+update|this\s+update\s+brings|feature\s+in)\b/i;
// Follower milestones: "3K followers", "thank you so much", "thanks for"
const FOLLOWER_MILESTONE_RE = /\b(followers|thank\s+you|thanks\s+for)\b/i;
// VC/GP fund raises (not company raises): "first-time GP", "LP market", "to invest in"
const VC_FUND_RE = /\b(GP|LP\s+market|invest\s+in\s+\w+\s+stuff|fund\s+I{1,3}\b|limited\s+partners?)\b/i;
// News / third-party reporting: "Daily Hard Tech Headlines", "according to"
const NEWS_RE = /\bdaily\b.*\bheadlines\b|\baccording\s+to\b|\breported\s+that\b/i;
// Contest / giveaway: "prize pool", "raffle"
const CONTEST_RE = /\b(prize\s+pool|raffle|sweepstakes)\b/i;
// Third-person startup reporting: "An AI startup... has raised", "the company raised"
const THIRD_PARTY_RE = /\ban?\s+[\w-]+[\s\w-]*\bstartup\b.*\braised\b|\bthe\s+[\w\s]+\bstartup\b.*\braised\b|\bthe\s+company\b.*\braised\b/i;
// Political / government: "U.S. Tech Corps", "policy", "bipartisan"
const POLITICAL_RE = /\b(congress|bipartisan|legislation|executive\s+order|policy\s+research|government|senator|secretary)\b/i;
// Sports: "players", "striker", "FC", "coach", "season opener"
const SPORTS_RE = /\b(striker|midfielder|goalkeeper|FC\b|head\s+coach|season\s+opener|match\s+day|lineup)\b/i;
// Clickbait copy: "here's how we did it", "here's how I did it"
const CLICKBAIT_RE = /\bhere'?s\s+how\s+(we|I)\s+did\s+it\b/i;
// Personal open-source / side projects: "my EEG", "fine tuned on my", "my side project"
const PERSONAL_PROJECT_RE = /\b(fine\s+tuned?\s+on\s+my|trained\s+on\s+my|my\s+side\s+project|my\s+EEG)\b/i;
// Training courses / tutorials: "Complete Excel Training", "full course", "masterclass"
const COURSE_RE = /\b(complete\s+\w+\s+training|full\s+course|masterclass|bootcamp|tutorial\s+series)\b/i;
// Engagement farming: "Like and Repost", "Follow me", "Absolutely Free"
const ENGAGEMENT_FARM_RE = /\b(like\s+and\s+repost|follow\s+me|absolutely\s+free|100%\s+free)\b/i;
// Anime / vtuber / fandom / card games / streams
const ANIME_FANDOM_RE = /\b(card\s+illustration|hololive|vtuber|pokemon|trading\s+card|GTA\s+character|ReGLOSS|anime|manga|waifu|gacha)\b|\[STREAM\]/i;

export function scoreLaunchRelevance(text: string): number {
  let score = 0;

  // Positive — primary launch signals
  if (INTRODUCING_RE.test(text)) score += 25;
  if (RAISED_RE.test(text)) score += 30;
  if (UNVEILING_RE.test(text)) score += 20;
  if (WORLDS_FIRST_RE.test(text)) score += 20;
  if (THE_FIRST_RE.test(text)) score += 10;
  if (CTA_RE.test(text)) score += 20;
  if (BOLD_CLAIM_RE.test(text)) score += 15;
  if (LAUNCHED_SHIPPED_RE.test(text)) score += 15;
  if (DOLLAR_OR_NUMBERS_RE.test(text)) score += 5;
  if (AI_TECH_RE.test(text)) score += 10;
  if (TECH_CONTEXT_RE.test(text)) score += 10;
  if (REPLACE_KILL_RE.test(text)) score += 10;
  if (FOUNDER_STORY_RE.test(text)) score += 15;
  if (NAMED_INVESTORS_RE.test(text)) score += 10;
  if (DEMO_PROMPT_RE.test(text)) score += 10;

  // Negative
  if (CRYPTO_NFT_RE.test(text)) score -= 20;
  if (RESEARCH_RE.test(text)) score -= 15;
  if (GAME_UPDATE_RE.test(text)) score -= 15;
  if (FEATURE_UPDATE_RE.test(text)) score -= 15;
  if (FOLLOWER_MILESTONE_RE.test(text)) score -= 20;
  if (VC_FUND_RE.test(text)) score -= 15;
  if (NEWS_RE.test(text)) score -= 15;
  if (CONTEST_RE.test(text)) score -= 10;
  if (THIRD_PARTY_RE.test(text)) score -= 15;
  if (POLITICAL_RE.test(text)) score -= 20;
  if (SPORTS_RE.test(text)) score -= 20;
  if (CLICKBAIT_RE.test(text)) score -= 15;
  if (PERSONAL_PROJECT_RE.test(text)) score -= 15;
  if (COURSE_RE.test(text)) score -= 15;
  if (ENGAGEMENT_FARM_RE.test(text)) score -= 15;
  if (ANIME_FANDOM_RE.test(text)) score -= 25;

  return Math.min(100, Math.max(0, score));
}

export const LAUNCH_RELEVANCE_THRESHOLD = 35;
