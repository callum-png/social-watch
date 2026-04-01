First-time setup for a new collaborator on this project. Run this once on a new machine.

Follow every step. Handle errors gracefully and explain what's happening in simple terms.

## Step 1: Check prerequisites
Verify these are installed (install any that are missing):
- **Node.js**: `node --version` (install via `winget install OpenJS.NodeJS.LTS` if missing)
- **Git**: `git --version` (install via `winget install Git.Git` if missing)
- **GitHub CLI**: `gh --version` (install via `npm install -g @github/cli` or `winget install GitHub.cli` if missing)

## Step 2: Install Dev Bot launcher
Create the Dev Bot launcher so `/dev-bot` works from any directory:
```
mkdir -p ~/.claude/commands
```
Then use the Write tool to create `~/.claude/commands/dev-bot.md` with the content from the LAUNCHER TEMPLATE section in `.claude/commands/dev-bot.md`.

This only needs to happen once. After that, Phase 0 keeps the launcher up to date automatically.

## Step 3: Clone the repo
```
git clone https://github.com/AlejandroShown/social-watch.git
cd social-watch
```
If already cloned, just `git pull` to get latest.

## Step 4: Install dependencies
```
npm install
```

## Step 5: Create .env.local
Ask the user for these values (or check if they already have them):

```
# Social Watch
DATABASE_URL=<ask user>
TWITTER_BEARER_TOKEN=<ask user>
ADMIN_PASSWORD=shownmedia2026
ADMIN_SESSION_SECRET=<ask user>
CRON_SECRET=<ask user>

# Post Tracker
NEXT_PUBLIC_POST_TRACKER_API_URL=https://backend-production-3069.up.railway.app
POST_TRACKER_API_PASSWORD=ShownGoat_
```

Tell the user: "Ask Alejandro for the env values if you don't have them."

## Step 6: Login to Vercel
```
npx vercel login
npx vercel link --yes
```
This lets you deploy from your machine.

## Step 7: Configure git identity
Ask the user for their name and email, then:
```
git config user.name "<name>"
git config user.email "<email>"
```

## Step 8: Verify everything works
```
npm run dev
```
Open http://localhost:3000 and confirm the app loads.

## Step 9: Done!
Tell the user:
- To deploy changes, just say `/deploy` to Claude Code
- That's it. Claude handles git, builds, deploys, and verification automatically.
