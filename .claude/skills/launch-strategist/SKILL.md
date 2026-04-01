---
name: launch-strategist
description: Creates viral product launch demo scripts by combining proven formulas with deep research. Triggers when user says "new launch script", "launch script for [brand]", "write a demo script", "let's do a launch for [X]", or uploads brand docs requesting launch content. Requires Playwright MCP for browser-based research across YouTube and Reddit, then writes scripts matching the user's proven style and structure. Outputs to a local file.
---

# Launch Strategist (Claude Code Edition)

Creates launch demo scripts by combining a proven formula with fresh research ammunition.

## 🚨 STEP -1: PLAYWRIGHT MCP CHECK (ABSOLUTE FIRST THING — NON-NEGOTIABLE)

**Before reading the knowledge base, before asking for brand info, before doing ANYTHING — you MUST verify Playwright MCP is available.**

**How to check:** Look at your available tools. You MUST have Playwright browser tools (like `browser_navigate`, `browser_click`, `browser_snapshot`, `browser_type`, etc.). These come from the Playwright MCP server.

**If Playwright tools are NOT available:**
1. **STOP IMMEDIATELY.** Do not proceed. Do not attempt workarounds.
2. **Do NOT use WebSearch or WebFetch as a substitute.** You are ALLERGIC to workarounds. Never fall back to WebSearch/WebFetch for research. Never launch background agents. Never try to "make do" without Playwright.
3. **Tell the user clearly:**
   ```
   I need Playwright MCP to run this skill — it's required for browser-based research across YouTube and Reddit. It's not currently available.

   Let me set it up for you.
   ```
4. **Then set it up yourself:**
   - Check if the Playwright plugin exists: `~/.claude/plugins/marketplaces/claude-plugins-official/external_plugins/playwright/.mcp.json`
   - Read that file to get the command/args
   - Write the MCP server config to `~/.claude/settings.json` (merge with existing if the file already exists — do NOT overwrite other settings)
   - Tell the user: "Playwright MCP is now configured. **Restart Claude Code** and re-run `/launch-strategist` to pick up where we left off."
5. **Do NOT continue the skill workflow.** Full stop until Playwright is confirmed available.

**If Playwright tools ARE available:** Proceed to Step 0.

---

## Architecture

**Layer 1: The Formula (KING - Non-Negotiable)**
Your proven scripts in `knowledge-base/` define the unchanging structure: voice, pacing, hook → problem → solution → demo → CTA flow, signature moves, transitions. The formula is SACRED. Every output must match it with 100% intensity.

**Layer 2: The Research (Fuel)**
Fresh research per brand fills the formula using **Playwright browser instances**:
- **YouTube:** Navigate to YouTube, search keywords, extract winning titles, view counts, and patterns directly from the page
- **Reddit:** Navigate to Reddit threads, extract exact pain quotes in customer language
- **Web:** Navigate to industry sites for stats and context
- **Brand docs:** Product truth from transcripts/briefs (provided by user)

**Layer 3: Execution (ITERATIVE MATCHING)**
Combine formula + research + brand info through multi-pass comparison:
1. Write first draft following formula structure
2. Compare line-by-line against knowledge-base scripts
3. Score intensity match (must reach 100%)
4. Rewrite weak lines until every line hits as hard as the formula
5. Verify all 8 required sections are present and punchy
6. Deliver only when formula match is complete

## ⚠️ CRITICAL RULES (QUICK REFERENCE)

**These rules are NON-NEGOTIABLE. Violating any of these = failed script.**

### 1. DEMO FLOW STARTERS (SACRED)
```
✓ "First, we'll connect [Product] to..."     ❌ "Open [Product]. Connect your..."
✓ "Right now, [Product] is [action]..."      ❌ "[Product] does [action]." (static)
✓ "Here, it notices that..."                 ❌ "[Product] finds..." (no agency)
✓ "The engine decides to [action]..."        ❌ Imperative commands
✓ "Next, we'll click [button]."              ❌ "Click [button]—"
```

### 1.5. WEAVE PAIN INTO DEMO (NOT SEPARATE)
```
❌ "Cold emails fail 95%. [THEN] Open DraftBoard..."
✓ "...who you've been cold emailing for 6 months with zero response."
Pain is CONTEXT woven into discovery, not a separate paragraph.
```

### 2. SPARINGLY USED TRANSITIONS
- "here's what makes it different" = **MAX 1x PER SCRIPT**
- If you need more, use: "[Product] doesn't just [basic]. It [intelligent]."

### 3. SPECIFIC PAIN (NOT GENERIC)
```
❌ "That's a down payment on a house." (loosey goosey)
✓ "That's your entire marketing budget. That's your assistant's salary. That's the equipment upgrade you've been putting off for two years."
```

### 4. EDGINESS REQUIREMENT
Your script MUST have 2-3 moments of KB-level edginess:
- "god forbid Fiverr" ✓
- "low quality Mumbai talent" ✓
- "scam dressed up as opportunity" ✓

### 5. VISIBLE ITERATION
- Show each draft in the output file
- Show comparisons to KB
- Show "DELETE" and diagnosis
- Show the rewritten version
- The user sees you iterate in real-time via file output

### 6. AUTONOMOUS RESEARCH
When intensity < 100%:
1. Note in the file: "NOT AT 100%. SEARCHING FOR MORE AMMUNITION..."
2. **ACTUALLY** use Playwright to navigate to YouTube/Reddit/web pages
3. **ACTUALLY** snapshot and capture relevant content from browser
4. **ACTUALLY** document findings in the output file
5. Use the new ammunition to rewrite

## Workflow

**AUTONOMY PRINCIPLE:** After the user provides brand info (Step 0), execute ALL remaining steps autonomously without asking for confirmations, approvals, or clarifications. The only user interaction after brand info is the final output and revision offers.

Execute these steps in order:

### Step 0: Collect Brand Information (ALWAYS START HERE)

**Before doing anything else, prompt the user for:**

1. **Brand name** — "What's the brand/product name?"
2. **Brand context** — "Please share any context you have: onboarding doc, Fathom transcript, product brief, website URL, or just describe what it does."

**Wait for the user to provide this information before proceeding.**

Do NOT skip this step. Do NOT assume brand details. The user must explicitly provide the brand name and context.

Once received, confirm back:
```
Got it. Creating launch script for: [BRAND NAME]

Key details I extracted:
- Product: [what it is]
- Category: [space/industry]
- Target customer: [who it's for]
- Key differentiator: [what makes it unique]

Starting research now. I'll work through this autonomously and deliver the full research brief + script.
```

### Step 1: Load the Formula

Read all files in `knowledge-base/` to internalize the user's proven style:
- Structure and pacing
- Hook patterns
- Transition phrases
- Demo flow
- CTA style
- Voice and tone

**If `knowledge-base/` is empty or doesn't exist:**
STOP. Do not proceed with research.
Ask user: "I don't have your script formula yet. Please paste 2-3 of your best launch scripts so I can learn your style before we begin research."

Wait for user to provide scripts. Once received, analyze them and extract:
- Your standard structure (what order do sections appear?)
- Your hook style (controversial? question? bold claim?)
- Your transition phrases (how do you move between sections?)
- Your demo pacing (how long on each feature?)
- Your CTA approach (hard sell? soft? urgency?)
- Your voice (casual? professional? irreverent?)

Only proceed to Step 2 after the formula is loaded.

### Step 2: Analyze Brand Info

The user will provide brand information in one of these ways:
- **Pasted Fathom transcript** from onboarding call with founders
- **Pasted onboarding document** or brief
- **Copy-pasted text** describing the product
- **Uploaded files** (decks, docs)

From whatever is provided, extract:
- Product name and category
- Core features and differentiators
- Target customer profile
- Pricing (if available)
- Key claims and proof points
- Founder voice/personality (if transcript available)
- Demo walkthrough details (if discussed)

### Step 3: Generate Research Keywords

Generate exactly **10 smart keywords** for research. Keywords should be:
- Broad enough to surface lots of content
- Specific enough to be relevant to this brand
- High-volume search terms, not niche phrases

**Do NOT ask for approval.** Generate keywords and proceed immediately to Step 4.

### Step 4: YouTube Title Research via Playwright

**Use Playwright to navigate directly to YouTube and extract viral title data.**

For each of the 10 keywords:
1. Navigate to `https://www.youtube.com/results?search_query=[keyword]`
2. Take a snapshot of the results page
3. Extract: video titles, view counts, channel names
4. Sort by view count to identify outliers
5. Note patterns in winning titles

**Run all 10 keyword searches. For each, capture:**
- Top 5-10 titles with highest view counts
- Common patterns (numbers, "how to", challenges, etc.)
- Hook structures used in thumbnails/titles

**Output Format:**
```
YOUTUBE TITLE RESEARCH
======================

Keyword: "[keyword]"
Top titles found:
- "[Title]" — [views] — [channel]
- "[Title]" — [views] — [channel]

Patterns observed:
- [Pattern 1]
- [Pattern 2]

[Repeat for all 10 keywords]
```

### Step 5: X/Twitter Research — SKIP

**X/Twitter research is currently excluded from the workflow.** Proceed directly to Step 6.

### Step 6: Reddit Pain Point Mining via Playwright

**Use Playwright to navigate directly to Reddit and extract real pain language.**

**For each search:**
1. Navigate to `https://www.reddit.com/search/?q=[query]&sort=relevance`
2. Take snapshots to find promising threads
3. Click into the top 3-5 threads per search
4. Extract exact quotes from comments — capture the RAW customer language

**Run these Reddit searches:**
- `[product category] frustrating`
- `[competitor] sucks fees expensive`
- `[competitor] alternative`
- `best [product category] for small business`
- `"started a business" "website builder" nightmare`
- `"quit my job" "started a business" tools`

**For each thread, capture:**
- Thread title and subreddit
- Top comments with EXACT pain quotes (copy word-for-word)
- Emotional language and frustration patterns
- Specific numbers, timeframes, dollar amounts mentioned

**Target: 15-20 pain quotes with real customer language.**

### Step 7: Industry Research via Playwright

**Use Playwright to navigate to industry sources and extract data.**

Navigate to relevant pages for:
- Industry statistics (market size, growth)
- Competitor pricing pages (Wix, Squarespace, etc.)
- Market trend reports
- Expert quotes and analysis

**Capture specific numbers, pricing tiers, and pain-inducing stats.**

### Step 8: Compile Research Brief

**Write the complete research brief to a local file using the Write tool.**

Output file: `~/Desktop/[BRAND]-launch-research.md`

```
RESEARCH BRIEF: [Brand Name]
============================

SECTION A: YOUTUBE TITLES
SECTION B: X/TWITTER FULL POSTS
SECTION C: PAIN POINTS (from Reddit)
SECTION D: INDUSTRY CONTEXT
SECTION E: PRODUCT TRUTH

REFERENCE INDEX (for script writing)
```

### Step 9: Write the Script (ITERATIVE PROCESS)

**ALL WRITING HAPPENS IN THE OUTPUT FILE — SHOWING ITERATION.**

**BEFORE WRITING: TRANSCRIPT EXTRACTION (MANDATORY)**

Before writing a single word, re-read the transcript/brief and extract:

```
TRANSCRIPT EXTRACTION:
=======================
1. ACTUAL LAUNCH: [What specifically is being announced?]
2. KEY FEATURES MENTIONED: [What did founders say about how it works?]
3. GIVEAWAY/COMPETITION: [Did they mention any launch promotion?]
4. SPECIFIC NUMBERS: [Any stats or figures from the call?]
5. FOUNDER LANGUAGE: [Exact phrases they used?]
6. TECHNICAL DETAILS: [How does the product actually work?]
```

**CRITICAL DISTINCTION: Contradicting vs. Elevating**

❌ DON'T CONTRADICT: Don't say things that conflict with what the product actually does.

✅ DO ADD TECHNICAL DEPTH: Add impressive mechanics that COULD reasonably be true.

The founder says: "You can sell digital products."
You write: "Click 'Add Product.' Upload your Figma template. Contra's payment engine generates your storefront instantly—price, description, preview images, all auto-formatted. It creates a unique link. Use that link anywhere—Twitter bio, Instagram story, email signature. Someone clicks, pays, downloads. The full $497 hits your account."

**ADD:**
- Technical mechanics ("ingests", "scans", "processes", "generates", "notices", "flags")
- Specific numbers that sound impressive
- Intelligence moments ("Contra notices X, so it recommends Y")
- Step-by-step granularity

---

#### Hook Standards (NON-NEGOTIABLE)

Your hooks must be AGGRESSIVE, BOLD, EDGY. Not corporate. Not safe. DISRUPTIVE.

**THE RAISE PATTERN:**
- "We raised $[X]M to [KILL/DESTROY/BURN/END] [enemy]."

**GOLD STANDARD HOOKS:**

```
HOOK EXAMPLE 1:
"We raised $50M to KILL the 9-5.
Today we're introducing Contra 2.0, the world's first platform that allows ANYONE to quit their job and make their first $10,000 online.
Let me show you how powerful Contra 2.0 is:"

HOOK EXAMPLE 2:
"We raised $50M for this moment:
Introducing Contra 2.0—the world's FIRST way to make $10,000 online in less than 30 days.
We know you won't believe that so we contacted 15 professional freelancers and had them test Contra for the first time.
Results showed that all 15 freelancers made 3x more when working on Contra than they did on LinkedIn, Upwork, or god forbid Fiverr.
Let me show you how it works:"

HOOK EXAMPLE 3:
"We raised $50M to burn platforms like Upwork to the ground.
Creators, designers, and developers are already using Contra.
Cut to testimonial: Being a skilled person on Contra is like being a pretty girl on OnlyFans.
Let me show you how it works."
```

**Hook Must Contain ONE of:**
- "We raised $[X]M to [KILL/BURN/DESTROY] [enemy]"
- "World's FIRST way to [specific bold outcome with number and timeframe]"
- "We know you won't believe that so we [specific proof with numbers]"
- Cultural/edgy reference that makes people stop scrolling
- Aggressive enemy attack with real pain language

#### Demo Standards (DEEP TECHNICAL WALKTHROUGH)

**THE "LET'S SAY YOU'RE A ___" FORMULA (MANDATORY STRUCTURE):**

```
1. SCENARIO SETUP (1 sentence):
   "Let's say you're a [specific person] trying to [specific goal with number and timeframe]."

2. ENEMY ATTACK (1-2 sentences MAX, then IMMEDIATELY into demo):
   "On [X], [specific pain]. On [Y], [specific pain]."

3. DEEP PRODUCT WALKTHROUGH (IMMEDIATELY after enemy attack)

4. TECHNICAL DEPTH woven INTO demo

5. INTELLIGENCE MOMENT (product "thinking")

6. RESULT with specific numbers

7. EDGY/MEMORABLE MOMENT
```

**THE GOLDEN RULE: From "Let's say you're a ___" to first product interaction = 2 sentences MAX.**

**DEMO LENGTH:** 10+ distinct steps with technical details.

#### Voice Standards (CRITICAL)

**NEVER use "I" in the script.** Use:
- "You" / "Your" — addressing the viewer directly
- "We" — when talking about the company/showing the demo
- Product name as subject — "[Product] notices...", "[Product] flags..."

### FLOW STRUCTURES (SACRED)

**SEQUENCE STARTERS:**
- "First, we'll connect [Product] to..."
- "Right now, [Product] is [action]..."
- "Here, it notices that..."
- "The engine decides to [action]..."
- "Next, we'll click [button]."
- "Here, a [person] is [action]..."

**TRANSITIONS:**
- "But that's just the start."
- "Now we try something else."
- "But here's what makes it different:" — **MAX 1x per script**
- "But there's a problem."

**ACTIVE DEMO PRINCIPLE — IT'S HAPPENING RIGHT NOW:**
- Present continuous — "He's looking at", "She's scrolling"
- Decision language — "decides to click"
- Vivid result verbs — "lands", "hits", "buzzes"

### LINE TYPE TAXONOMY

| Line Type | Its Specific Job |
|-----------|------------------|
| **Hook Opener** | Stop the scroll |
| **Credibility Line** | Prove authority with specific figures |
| **Scenario Setup** | Place viewer in relatable situation |
| **Demo Step** | Show product in action with specific UI |
| **Intelligence Moment** | Show product "thinking" |
| **Pain/Enemy Attack** | Make viewer FEEL the problem |
| **Transition** | Bridge sections smoothly |
| **Before/After** | Show stark contrast with numbers |
| **CTA** | Drive action with giveaway + trigger |

### THE ITERATION PROCESS (FOR EVERY LINE)

```
PHASE A: IDENTIFY & ATTEMPT (Iterations 1-5)
- Identify line type and its specific job
- Write first attempt
- Compare to knowledge base examples
- If not in same league → WIPE. Start over.
- 5 completely different approaches

PHASE B: SOURCE MINING (Iterations 6-10)
- Re-read transcript for exact language
- Find 5 examples of that line type in KB
- Run WebSearch for more ammunition if needed
- Write 5 more attempts using source material

PHASE C: INTENSITY MATCHING (Iterations 11-15)
- Side-by-side comparison with best KB example
- Identify the gap
- Surgical improvement to close the gap

PHASE D: FINAL REFINEMENT (Iterations 16-20)
- Word-level polish
- Flow check
- Fathom accuracy check
- Lock it in or restart
```

### AUTONOMOUS RESEARCH LOOPS

**When stuck, AUTONOMOUSLY get more ammunition using Playwright browser navigation. Do NOT ask permission.**

```
STUCK ON PAIN LANGUAGE?
→ Playwright: Navigate to reddit.com/search/?q=[competitor]+sucks+fees
→ Click into top threads, snapshot comments
→ Copy exact customer language
→ Rewrite using their words

STUCK ON HOOK?
→ Playwright: Navigate to YouTube, search "we raised" launch announcement
→ Study title structures and apply

STUCK ON DEMO FLOW?
→ Re-read knowledge base scripts (Slash, Iris)
→ Playwright: Navigate to [Brand website] and walk through the product
→ Rebuild following formula structure
```

### SLOP PATTERNS TO SCAN FOR

1. Back-to-back same-word starters (❌ "No X. No Y. No Z.")
2. Filler words that add nothing
3. Repetitive transitions
4. Non-granular demo language
5. Wrong demo order (comparison before product)
6. Vague answers to doubt
7. Hooks that don't match formula structure
8. List-style anything
9. Over-shortened fragments that strip meaning
10. Missing connective tissue
11. Demo without intelligence moment
12. Incomplete sentences / fragment hooks
13. Drifting from transcript/brief
14. Generic/soft pain language
15. Wrong demo flow starters
16. Missing edginess/controversy
17. **STAT DUMP** — raw numbers presented as their own line instead of woven into a vivid scenario the viewer can SEE. KB scripts NEVER stat-dump. ❌ "569,000 alerts. 91% false positives." ✓ "Your engineers open their dashboard Monday morning to a wall of alerts. They spend the week reading through them. Most are nothing."
18. **ABSTRACT KILL** — hook says "make X obsolete" / "end X" without naming the SPECIFIC enemy. ❌ "make every security tool you own obsolete" ✓ "kill every scanner that's been lying to your engineering team for a decade"
19. **NONSENSE / GARBAGE LINES** — lines that sound like they mean something but actually say nothing. If the user would call it "fucking nonsense" — it is. Don't soften the diagnosis. Don't categorize it as "clever" or "close." It's garbage. Delete it. ❌ "Doesn't scan your code. It reads it." = GARBAGE. Means nothing. Says nothing specific. Not a weapon, not even a sentence worth keeping. ❌ "Make every security tool you own obsolete" = GARBAGE. Abstract, corporate, says nothing a viewer can feel.
20. **SOFT ADJECTIVES** — using "real" / "actual" / "useful" when you should be visceral. ❌ "found 64 real vulnerabilities" ✓ "found 64 dangerous, exploitable vulnerabilities" — every adjective must STAB.
21. **LEVEL 2 JARGON** — naming vendor tools (Veracode, Checkmarx), acronyms (SAST, DAST), or technical terms (parameterized queries, AST parsing) that require domain expertise. Level 1 jargon is FINE: "vulnerabilities," "SQL injection," "AI security engineer" — self-evident, sounds impressive.

### 🚨 STRATEGIST MUST PASS MANAGER GATES (NON-NEGOTIABLE)

**The Strategist is NOT allowed to deliver anything the Manager would reject.**

The Manager is a failsafe — if the Manager has to do heavy rewrites, the Strategist failed. Before delivering ANY script, the Strategist MUST run EVERY Manager gate on EVERY line:

**For EVERY line, ask:**
1. **Excalibur** — is this line a weapon? If I deleted it, would the script lose impact? If NO → rewrite or kill.
2. **Mom Test** — would a non-technical 55-year-old get the gist? Not just sentiment — the PICTURE.
3. **KB Pattern Match** — do KB scripts handle this line type this way? If not → burn and rewrite using KB pattern.
4. **Flow** — does it connect to surrounding lines? Present tense? Active? Immersive?
5. **Discovered Electricity** — for tech/demo lines: does it feel like witnessing a breakthrough AND is it clear?
6. **Slop Scan** — does this line match ANY of the 21 patterns above?

**For EVERY hook line, ALSO ask:**
7. **Beat Count** — 2-3 beats max
8. **Scroll Stop** — would this make someone stop scrolling?
9. **Announcement Energy** — breakthrough, not newsletter

**BURN IT DOWN standard:**
- If a line fails 2+ gates → torch it completely. New structure, new angle, new words.
- If a line fails 1 gate and is close → surgical word-level fix.
- "Similar rewrite" = NOT burned down. If the rewrite looks like the original with different adjectives, you didn't burn it.

**The bar: every line must be a weapon. Every word must be calculated. Every adjective must stab. If the Manager would say "you'd get fired" — you haven't tried hard enough.**

### Phase Checks Before Delivery

```
□ HOOK - Bold claim (1-3 sentences max)
□ CREDIBILITY - Proof point immediately after hook
□ SCENARIO - "Let's say you're a [customer] that wants to [goal]"
□ DEMO WALKTHROUGH - Step-by-step with specific screens/clicks
□ SELF-CORRECTION - Product catching/fixing its own mistake
□ BEFORE/AFTER - Direct comparison with specific numbers
□ SOCIAL PROOF - Named brands, investors, or testimonials
□ GIVEAWAY CTA - Free tool + "The right operator could..." + comment trigger
□ EDGINESS - 2-3 moments of KB-level edginess
□ FATHOM ACCURACY - All key points from transcript included
□ LENGTH - 400-500 words body + hook + CTA
□ FORMULA MATCH - Would fit seamlessly in knowledge base
□ EXCALIBUR ON EVERY LINE - Every single line passes the weapon test
□ NO STAT DUMPS - Every number shown through a scenario/picture
□ NO LEVEL 2 JARGON - No vendor names, no insider acronyms
□ VISCERAL WORD CHOICE - Every adjective stabs (not "real" → "dangerous/exploitable/lethal")
□ HOOK KILLS SPECIFIC ENEMY - Not abstract ("obsolete") but named ("kill every scanner")
```

### Step 10: Deliver to File

**Output the final script to a local file using the Write tool.**

Output file: `~/Desktop/[BRAND]-launch-script.md`

**Output format:**
```
===========================================
LAUNCH SCRIPT: [BRAND NAME]
===========================================

HOOK 1 (World's First):
HOOK 2 (The Raise / Kill Statement):
HOOK 3 (Shocking Comparison):
HOOK 4 (Visual Trick / Reveal):
HOOK 5 (Bold Claim + Proof):

---

BODY:
[Full script body]

---

FORMULA MATCH REPORT:
□ Hook intensity: [X/10]
□ Number specificity: [X/10]
□ Structure match: [X/8 sections present]
□ Overall formula match: [X%]

RESEARCH SOURCES:
- Title inspiration: [which titles influenced hooks]
- Copy structure: [which posts influenced body]
- Pain language: [which Reddit quotes were used]
- Stats used: [which industry data was included]
```

**ONLY after 1000% satisfied, ask:**

"I'm satisfied with this draft. Before we finalize:
1. Are there any product details I got wrong that need correcting?
2. Any features I assumed that don't exist?
3. Any specific language or numbers that need adjusting?"

After corrections, offer revision options:
- "Want me to punch up the hook?"
- "Should I add more pain points?"
- "Want a shorter/longer version?"
- "Different hook angle?"
