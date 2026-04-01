import { App, type BlockAction, type ButtonAction, type MultiStaticSelectAction } from "@slack/bolt";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, ilike } from "drizzle-orm";
import * as schema from "../db/schema";

const { savedReferences, savedReferenceBrands, clients } = schema;

function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

// ─── URL extraction ───

function extractUrls(text: string): string[] {
  // Slack wraps URLs in angle brackets: <https://example.com|label>
  const slackUrlPattern = /<(https?:\/\/[^>|]+)(?:\|[^>]*)?>/g;
  const urls: string[] = [];
  let match;
  while ((match = slackUrlPattern.exec(text)) !== null) {
    urls.push(match[1]);
  }
  if (urls.length === 0) {
    const plainUrlPattern = /https?:\/\/[^\s<>]+/g;
    while ((match = plainUrlPattern.exec(text)) !== null) {
      urls.push(match[0]);
    }
  }
  return [...new Set(urls)];
}

function detectPlatform(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("tiktok.com")) return "tiktok";
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("facebook.com") || host.includes("fb.com") || host.includes("meta.com")) return "facebook";
    return "other";
  } catch {
    return "other";
  }
}

function platformLabel(p: string): string {
  const labels: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube", facebook: "Meta", other: "Link" };
  return labels[p] ?? p;
}

// ─── Client name parsing ───

function parseClientName(text: string): string | null {
  const cleaned = text.replace(/<@[A-Z0-9]+>/g, "").replace(/<https?:\/\/[^>]+>/g, "").trim();
  const match = cleaned.match(/(?:under|for|save\s+(?:under|to|for))\s+(.+?)$/i);
  return match ? match[1].trim() : null;
}

// ─── Session state ───

interface PendingSession {
  urls: { url: string; platform: string }[];
  currentIndex: number;
  slackUser: string;
  slackChannel: string;
  slackTs: string;
  selectedClients: Map<number, { id: number; name: string }[]>;
}

const sessions = new Map<string, PendingSession>();

async function buildLinkMessage(session: PendingSession) {
  const db = getDb();
  const allClients = await db.select().from(clients).orderBy(clients.name);
  const { urls, currentIndex } = session;
  const link = urls[currentIndex];
  const total = urls.length;

  const blocks: any[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Link ${currentIndex + 1} of ${total}:*\n<${link.url}|${platformLabel(link.platform)} link>`,
      },
    },
  ];

  if (allClients.length > 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "Select client(s) for this link:" },
      accessory: {
        type: "multi_static_select",
        action_id: "select_clients",
        placeholder: { type: "plain_text", text: "Choose clients..." },
        options: allClients.map((c) => ({
          text: { type: "plain_text", text: c.name.slice(0, 75) },
          value: JSON.stringify({ id: c.id, name: c.name }),
        })),
      },
    });
  } else {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: '_No clients yet. Say `@bot add client ClientName` to add one, or include "under ClientName" in your message to auto-create._',
      },
    });
  }

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: total > 1 ? "Save & Next" : "Save", emoji: true },
        style: "primary",
        action_id: "save_link",
        value: "save",
      },
      {
        type: "button",
        text: { type: "plain_text", text: "Skip", emoji: true },
        action_id: "skip_link",
        value: "skip",
      },
    ],
  });

  return { text: `Link ${currentIndex + 1} of ${total}: ${link.url}`, blocks };
}

// ─── Save a reference + client associations ───

async function saveReference(
  url: string,
  platform: string,
  clientList: { id: number; name: string }[],
  slackUser: string,
  slackChannel: string,
  slackTs: string,
) {
  const db = getDb();

  // Insert reference (or get existing if URL already saved)
  const [ref] = await db
    .insert(savedReferences)
    .values({ url, platform, sharedBy: slackUser, slackMessageTs: slackTs, slackChannelId: slackChannel })
    .onConflictDoNothing()
    .returning({ id: savedReferences.id });

  let refId: number;
  if (ref) {
    refId = ref.id;
  } else {
    // Already exists — look it up
    const [existing] = await db.select({ id: savedReferences.id }).from(savedReferences).where(eq(savedReferences.url, url));
    if (!existing) return;
    refId = existing.id;
  }

  // Associate with clients (using the savedReferenceBrands table — foreplayBoardId/Name will hold our client info)
  for (const client of clientList) {
    await db
      .insert(savedReferenceBrands)
      .values({
        referenceId: refId,
        foreplayBoardId: String(client.id),
        foreplayBoardName: client.name,
      })
      .onConflictDoNothing();
  }
}

// ─── Bot ───

export function createSlackBot() {
  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
  });

  app.event("app_mention", async ({ event, say }) => {
    const db = getDb();
    const text = event.text ?? "";
    const cleaned = text.replace(/<@[A-Z0-9]+>/g, "").trim();

    // ── Client management commands ──

    const addMatch = cleaned.match(/^add\s+client\s+(.+)/i);
    if (addMatch) {
      const name = addMatch[1].trim();
      try {
        await db.insert(clients).values({ name }).onConflictDoNothing();
        await say({ thread_ts: event.ts, text: `Added *${name}* to the client list.` });
      } catch (err) {
        console.error("Error adding client:", err);
        await say({ thread_ts: event.ts, text: `Failed to add client — it may already exist.` });
      }
      return;
    }

    const removeMatch = cleaned.match(/^(?:remove|delete)\s+client\s+(.+)/i);
    if (removeMatch) {
      const name = removeMatch[1].trim();
      const deleted = await db.delete(clients).where(ilike(clients.name, name)).returning();
      await say({
        thread_ts: event.ts,
        text: deleted.length > 0 ? `Removed *${name}* from the client list.` : `Couldn't find a client named "${name}".`,
      });
      return;
    }

    if (/^(?:list|show)\s+clients?$/i.test(cleaned)) {
      const allClients = await db.select().from(clients).orderBy(clients.name);
      if (allClients.length === 0) {
        await say({ thread_ts: event.ts, text: "No clients yet. Say `@bot add client ClientName` to add one." });
      } else {
        await say({
          thread_ts: event.ts,
          text: `*Clients (${allClients.length}):*\n${allClients.map((c) => `• ${c.name}`).join("\n")}\n\nUse \`add client Name\` or \`remove client Name\` to manage.`,
        });
      }
      return;
    }

    // ── Link handling ──

    const urls = extractUrls(text);

    if (urls.length === 0) {
      await say({
        thread_ts: event.ts,
        text: "I didn't find any links in that message.\n\n*Commands:*\n• Share links to save them\n• `add client Name` — add a client\n• `remove client Name` — remove a client\n• `list clients` — show all clients",
      });
      return;
    }

    const parsedUrls = urls.map((u) => ({ url: u, platform: detectPlatform(u) }));

    // Check if message specifies a client: "save under XNotes"
    const clientName = parseClientName(text);
    if (clientName) {
      // Look up or auto-create client
      let [client] = await db.select().from(clients).where(ilike(clients.name, clientName));
      if (!client) {
        [client] = await db.insert(clients).values({ name: clientName }).returning();
      }

      for (const { url, platform } of parsedUrls) {
        await saveReference(url, platform, [{ id: client.id, name: client.name }], event.user ?? "unknown", event.channel, event.ts);
      }
      await say({
        thread_ts: event.ts,
        text: `Saved ${parsedUrls.length} link${parsedUrls.length > 1 ? "s" : ""} under *${client.name}*.`,
      });
      return;
    }

    // No client specified — interactive picker, one link at a time
    const session: PendingSession = {
      urls: parsedUrls,
      currentIndex: 0,
      slackUser: event.user ?? "unknown",
      slackChannel: event.channel,
      slackTs: event.ts,
      selectedClients: new Map(),
    };

    if (parsedUrls.length > 1) {
      await say({ thread_ts: event.ts, text: `Found ${parsedUrls.length} links. Let's tag them one by one.` });
    }

    const msg = await buildLinkMessage(session);
    const result = await say({ thread_ts: event.ts, ...msg });
    if (result.ts) sessions.set(result.ts, session);
  });

  // Track multi-select changes
  app.action<BlockAction<MultiStaticSelectAction>>("select_clients", async ({ action, body, ack }) => {
    await ack();
    const messageTs = body.message?.ts;
    if (!messageTs || !sessions.has(messageTs)) return;

    const session = sessions.get(messageTs)!;
    const selected = (action.selected_options ?? []).map((opt) => {
      const p = JSON.parse(opt.value);
      return { id: p.id as number, name: p.name as string };
    });
    session.selectedClients.set(session.currentIndex, selected);
  });

  // Save & Next
  app.action<BlockAction<ButtonAction>>("save_link", async ({ body, ack, respond }) => {
    await ack();
    const messageTs = body.message?.ts;
    if (!messageTs || !sessions.has(messageTs)) {
      await respond({ text: "Session expired. Please share the links again.", replace_original: true });
      return;
    }

    const session = sessions.get(messageTs)!;
    const link = session.urls[session.currentIndex];
    const selectedClients = session.selectedClients.get(session.currentIndex) ?? [];

    if (selectedClients.length === 0) {
      await respond({ text: "Please select at least one client first.", replace_original: false });
      return;
    }

    await saveReference(link.url, link.platform, selectedClients, session.slackUser, session.slackChannel, session.slackTs);
    const clientNames = selectedClients.map((c) => c.name).join(", ");

    session.currentIndex++;

    if (session.currentIndex >= session.urls.length) {
      sessions.delete(messageTs);
      await respond({
        text: `Saved *${platformLabel(link.platform)}* link under *${clientNames}*. All ${session.urls.length} links done!`,
        replace_original: true,
      });
    } else {
      const msg = await buildLinkMessage(session);
      await respond({
        text: `Saved under *${clientNames}*. Next link:`,
        blocks: [
          { type: "section", text: { type: "mrkdwn", text: `Saved *${platformLabel(link.platform)}* link under *${clientNames}*` } },
          { type: "divider" },
          ...msg.blocks,
        ],
        replace_original: true,
      });
    }
  });

  // Skip
  app.action<BlockAction<ButtonAction>>("skip_link", async ({ body, ack, respond }) => {
    await ack();
    const messageTs = body.message?.ts;
    if (!messageTs || !sessions.has(messageTs)) {
      await respond({ text: "Session expired. Please share the links again.", replace_original: true });
      return;
    }

    const session = sessions.get(messageTs)!;
    const link = session.urls[session.currentIndex];
    session.currentIndex++;

    if (session.currentIndex >= session.urls.length) {
      sessions.delete(messageTs);
      await respond({
        text: `Skipped *${platformLabel(link.platform)}* link. All ${session.urls.length} links done!`,
        replace_original: true,
      });
    } else {
      const msg = await buildLinkMessage(session);
      await respond({
        text: "Skipped. Next link:",
        blocks: [
          { type: "section", text: { type: "mrkdwn", text: `Skipped *${platformLabel(link.platform)}* link.` } },
          { type: "divider" },
          ...msg.blocks,
        ],
        replace_original: true,
      });
    }
  });

  return app;
}
