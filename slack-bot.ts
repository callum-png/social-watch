import { config } from "dotenv";
config({ path: ".env.local" });

import { createSlackBot } from "./src/lib/slack-bot";

async function main() {
  const required = ["SLACK_BOT_TOKEN", "SLACK_APP_TOKEN", "DATABASE_URL"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(", ")}`);
    console.error("Add them to .env.local and re-run.");
    process.exit(1);
  }

  const app = createSlackBot();
  await app.start();
  console.log("Slack bot is running in Socket Mode");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
