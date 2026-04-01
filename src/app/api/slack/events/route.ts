import { NextRequest, NextResponse } from "next/server";
import { verifySlackRequest } from "@/lib/slack-verify";
import { db } from "@/db";
import { savedReferences, savedReferenceBrands } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAllBoards, type ForeplayBrand } from "@/lib/foreplay";

// Slack sends retries if we don't respond quickly — dedupe them
const processed = new Set<string>();

function slackToken(): string {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is not set");
  return token;
}

function signingSecret(): string {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) throw new Error("SLACK_SIGNING_SECRET is not set");
  return secret;
}

// ─── Helpers ───

function extractUrls(text: string): string[] {
  // Slack wraps URLs in angle brackets: <https://example.com>
  const slackUrlPattern = /<(https?:\/\/[^>|]+)(?:\|[^>]*)?>/g;
  const urls: string[] = [];
  let match;
  while ((match = slackUrlPattern.exec(text)) !== null) {
    urls.push(match[1]);
  }
  // Fallback: plain URLs
  if (urls.length === 0) {
    const plainUrlPattern = /https?:\/\/[^\s<>]+/g;
    while ((match = plainUrlPattern.exec(text)) !== null) {
      urls.push(match[0]);
    }
  }
  return urls;
}

function detectPlatform(url: string): string {
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes("tiktok.com")) return "tiktok";
  if (host.includes("instagram.com")) return "instagram";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
  if (host.includes("facebook.com") || host.includes("fb.com")) return "facebook";
  return "other";
}

async function postSlackMessage(channel: string, text: string, threadTs: string) {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${slackToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel, text, thread_ts: threadTs }),
  });
  if (!res.ok) {
    console.error("Slack postMessage failed:", await res.text());
  }
}

function normalizeName(name: string): string {
  return name
    .replace(/^#/, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .trim();
}

function fuzzyMatchBoards(
  input: string[],
  boards: ForeplayBrand[]
): { matched: ForeplayBrand[]; unmatched: string[] } {
  const matched: ForeplayBrand[] = [];
  const unmatched: string[] = [];

  for (const raw of input) {
    const normalized = normalizeName(raw);
    if (!normalized) continue;

    const board = boards.find((b) => {
      const boardNorm = normalizeName(b.name);
      return boardNorm === normalized || boardNorm.includes(normalized) || normalized.includes(boardNorm);
    });

    if (board) {
      if (!matched.some((m) => m.id === board.id)) {
        matched.push(board);
      }
    } else {
      unmatched.push(raw.trim());
    }
  }

  return { matched, unmatched };
}

// ─── Handlers ───

async function handleAppMention(event: {
  text: string;
  user: string;
  ts: string;
  channel: string;
}) {
  const urls = extractUrls(event.text);

  if (urls.length === 0) {
    await postSlackMessage(
      event.channel,
      "I didn't find any links in your message. Tag me with a URL to save it!",
      event.ts
    );
    return;
  }

  // Save each URL
  const savedIds: number[] = [];
  for (const url of urls) {
    const platform = detectPlatform(url);
    try {
      const [row] = await db
        .insert(savedReferences)
        .values({
          url,
          platform,
          sharedBy: event.user,
          slackMessageTs: event.ts,
          slackChannelId: event.channel,
        })
        .onConflictDoNothing()
        .returning({ id: savedReferences.id });

      if (row) savedIds.push(row.id);
    } catch (err) {
      console.error("Error saving reference:", err);
    }
  }

  // Fetch all Foreplay boards
  let boards: ForeplayBrand[] = [];
  try {
    boards = await getAllBoards();
  } catch (err) {
    console.error("Error fetching boards:", err);
  }

  const boardList =
    boards.length > 0
      ? boards.map((b) => b.name).join(", ")
      : "(could not load boards)";

  const urlLabel = urls.length === 1 ? "link" : `${urls.length} links`;
  await postSlackMessage(
    event.channel,
    `Saved ${urlLabel}! Which board(s) should I tag ${urls.length === 1 ? "it" : "them"} to? Reply with brand name(s), comma-separated.\n\nAvailable boards: ${boardList}`,
    event.ts
  );
}

async function handleThreadReply(event: {
  text: string;
  user: string;
  ts: string;
  thread_ts: string;
  channel: string;
}) {
  // Check if the thread parent is one of our saved references
  const refs = await db
    .select()
    .from(savedReferences)
    .where(eq(savedReferences.slackMessageTs, event.thread_ts));

  if (refs.length === 0) return; // Not our thread

  // Parse brand names from the reply
  const brandNames = event.text.split(",").map((s) => s.trim()).filter(Boolean);

  if (brandNames.length === 0) {
    await postSlackMessage(
      event.channel,
      "Please reply with one or more brand/board names, separated by commas.",
      event.thread_ts
    );
    return;
  }

  // Fetch boards for matching
  let boards: ForeplayBrand[] = [];
  try {
    boards = await getAllBoards();
  } catch (err) {
    console.error("Error fetching boards:", err);
    await postSlackMessage(
      event.channel,
      "Sorry, I couldn't load the board list right now. Please try again.",
      event.thread_ts
    );
    return;
  }

  const { matched, unmatched } = fuzzyMatchBoards(brandNames, boards);

  // Save matched boards for all references in this thread
  for (const ref of refs) {
    for (const board of matched) {
      try {
        await db
          .insert(savedReferenceBrands)
          .values({
            referenceId: ref.id,
            foreplayBoardId: board.id,
            foreplayBoardName: board.name,
          })
          .onConflictDoNothing();
      } catch (err) {
        console.error("Error saving reference brand:", err);
      }
    }
  }

  // Build reply
  const parts: string[] = [];
  if (matched.length > 0) {
    parts.push(`Saved to: ${matched.map((b) => b.name).join(", ")}`);
  }
  if (unmatched.length > 0) {
    parts.push(`Couldn't match: ${unmatched.join(", ")}`);
  }

  await postSlackMessage(event.channel, parts.join("\n"), event.thread_ts);
}

// ─── Route ───

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // URL verification doesn't need signature check (Slack sends it during setup)
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Handle URL verification challenge
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  // Verify Slack signature for all other requests
  const isValid = verifySlackRequest(signingSecret(), {
    signature: request.headers.get("x-slack-signature"),
    timestamp: request.headers.get("x-slack-request-timestamp"),
  }, rawBody);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Dedupe retries
  const eventId = body.event_id as string | undefined;
  if (eventId) {
    if (processed.has(eventId)) {
      return NextResponse.json({ ok: true });
    }
    processed.add(eventId);
    // Clean up old entries to avoid memory leak
    if (processed.size > 1000) {
      const first = processed.values().next().value;
      if (first) processed.delete(first);
    }
  }

  const event = body.event as Record<string, unknown> | undefined;
  if (!event) {
    return NextResponse.json({ ok: true });
  }

  const eventType = event.type as string;

  // Ignore bot messages to prevent loops
  if (event.bot_id || event.subtype === "bot_message") {
    return NextResponse.json({ ok: true });
  }

  // Respond to Slack immediately, process in background
  // (Slack requires a 200 within 3 seconds)
  if (eventType === "app_mention") {
    // Don't await — fire and forget
    handleAppMention(event as Parameters<typeof handleAppMention>[0]).catch(
      (err) => console.error("handleAppMention error:", err)
    );
  } else if (eventType === "message" && event.thread_ts) {
    handleThreadReply(event as Parameters<typeof handleThreadReply>[0]).catch(
      (err) => console.error("handleThreadReply error:", err)
    );
  }

  return NextResponse.json({ ok: true });
}
