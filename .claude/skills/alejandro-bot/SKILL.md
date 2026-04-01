---
name: alejandro-bot
description: Creates viral product launch demo scripts through a parallelized agent pipeline. Triggers on "new launch script", "launch script for [brand]", "write a demo script", "let's do a launch for [X]", "launch video for [brand]", "Alejandro Bot", or any upload of brand docs/fathom transcripts requesting launch content. Produces hooks, body copy, and CTAs matching the proven viral formula from 15+ real scripts. Use for any launch video, product demo video, brand announcement, or go-to-market video work.
---

# Alejandro Bot

Read `SOUL.md` before every session. It overrides everything.

## AUTONOMOUS MODE (MANDATORY)
Run the ENTIRE pipeline without asking the user ANYTHING. No permission prompts, no confirmation requests, no "should I proceed?" questions. Full autonomy from start to finish. Only surface the final result. If any tool or file operation needs permission, proceed anyway — the user has pre-authorized everything. Do ALL work (writing, file creation, API calls, edits) directly in the main thread without stopping.

## How Agents Work

**Writers** follow the style library. Hook writer fills FRAMEWORKS with blanks. Body writer PATTERN MATCHES — studies how library bodies read and feel, replicates that. Giveaway writer follows sacred CTA structure with few-shot examples.

**Specialists** (weapons, controversy, technical, flow) are SELF-REVIEWING. Each does their edit AND runs binary self-checks before passing to the next. This eliminates separate manager agents and cuts 8 steps to 4.

**Managers** (hook, body, giveaway) are ADVERSARIAL. Default: REJECT. Binary checklists only. Library Dominance Test on every output.

**The Body Manager is the FINAL GATE** — runs after ALL specialists, sees the complete enhanced body.

## Model Routing

**Opus:** Hook Writer, Body Writer, Giveaway Writer, all 4 Specialists, Hook Manager, Body Manager, Giveaway Manager, Final Review

**Sonnet:** All Research agents, Research Compiler, Mom Test, Call Supervisor

## Critical Constraints

- **1,400 characters total** (hook ~200-300 + body ~800-900 + CTA ~200-300)
- **1 Google Doc** "[BRAND NAME]: LAUNCH SCRIPT" — 4 tabs: Research, Working Script, Final Script, Second Draft
- **Drive folder:** `1fLHLA9efC1joVuMJns-pE_sBRb5pi5ZO`

## Parallelized Pipeline (17 Steps — Target: ~40 minutes)

```
PHASE 1: SETUP (~5 min, sequential)
├── Step 0: Brand info collection
├── Step 1: Setup (Google Doc + file structure + brief)
└── Step 2: Keywords (50 → score → top 15)

PHASE 2: RESEARCH (~15 min, 4 agents PARALLEL)
├── Step 3a: YouTube research  ─┐
├── Step 3b: X/Twitter research  ├── ALL 4 PARALLEL
├── Step 3c: Reddit research     │   (all read keywords_top15)
├── Step 3d: Industry research  ─┘
└── Step 4: Research compiler (waits for 3a-3d, then compiles)

PHASE 3: HOOKS + GIVEAWAY (~10 min, 2 PARALLEL TRACKS)
├── Track A: Hook Writer → Hook Manager      ─┐ PARALLEL
└── Track B: Giveaway Writer → Giveaway Mgr  ─┘ (both need brief + research, neither needs the other)

PHASE 4: BODY (~15 min, sequential chain)
├── Step 8: Body Writer (needs hooks_approved for angle)
├── Step 9: Weapons Specialist (self-reviewing)
├── Step 10: Controversy Specialist (self-reviewing)
├── Step 11: Technical Specialist (self-reviewing)
├── Step 12: Flow Specialist (self-reviewing)
└── Step 13: Body Manager (FINAL GATE — adversarial, sees complete body)

PHASE 4.5: FATHOM CHECKER (~5 min, after Body Manager)
└── Step 13.5: Fathom Checker (re-reads FULL transcript, acts as brand, harsh feedback)
    → Routes issues to specific writers → re-runs downstream specialists if body changes

PHASE 5: QUALITY + DELIVER (~5 min)
├── Step 14a: Mom Test ──────────┐ PARALLEL
├── Step 14b: Call Supervisor ───┘ (both read final script)
├── Step 15: Final Review (3-pass + 1,400 char enforcement)
└── Step 16: Deliver → Tab 3 (revisions → Tab 4)
```

**Time savings vs sequential:** Research parallel saves ~30 min. Hooks+Giveaway parallel saves ~10 min. Self-reviewing specialists (no separate managers) saves ~15 min. Mom Test+Call Supervisor parallel saves ~5 min. **Total: ~60 min saved.**

---

## Agent Boot Template

Every agent launches as a subprocess. Orchestrator uses:

```bash
claude -p "$(cat SOUL.md)

$(cat agents/[AGENT].md)

$(cat knowledge-base/[KB-FILES].md)

BRAND BRIEF:
$(cat ~/Desktop/[BRAND]-launch/brief.md)

[PRIOR OUTPUTS AS NEEDED]

Execute now for [BRAND]." --model [opus/sonnet]
```

### What loads per agent:

| Agent | SOUL | Agent File | KB Files | Other Inputs | Model |
|---|---|---|---|---|---|
| Research Agent | ✓ | research-agent.md | — | brief | Sonnet |
| YouTube Research | ✓ | youtube-research.md | — | keywords_top15, systems-infrastructure | Sonnet |
| X Research | ✓ | x-research.md | — | keywords_top15, brief, systems-infrastructure | Sonnet |
| Reddit Research | ✓ | reddit-research.md | — | brief | Sonnet |
| Industry Research | ✓ | industry-research.md | — | brief | Sonnet |
| Research Compiler | ✓ | research-compiler.md | — | ALL research/*.md | Sonnet |
| Hook Writer | ✓ | hook-writer.md | hooks-library, voice-dna, before-afters | brief, research_brief, nugget_base | Opus |
| Hook Manager | ✓ | hook-manager.md | hooks-library, before-afters, scoring-rubrics | hooks_draft | Opus |
| Giveaway Writer | ✓ | giveaway-writer.md | giveaways-library, voice-dna, before-afters | brief, research_brief | Opus |
| Giveaway Manager | ✓ | giveaway-manager.md | giveaways-library, scoring-rubrics, systems-infrastructure | giveaway_draft | Opus |
| Body Writer | ✓ | body-writer.md | bodies-library, voice-dna, intelligence-moments, before-afters | brief, research_brief, nugget_base, hooks_approved | Opus |
| Weapons Specialist | ✓ | weapons-specialist.md | weapons-library, scoring-rubrics | body_draft | Opus |
| Controversy Specialist | ✓ | controversy-specialist.md | weapons-library, scoring-rubrics | weapons_done.md | Opus |
| Technical Specialist | ✓ | technical-specialist.md | scoring-rubrics | brief (fathom), controversy_done.md | Opus |
| Flow Specialist | ✓ | flow-specialist.md | voice-dna, slop-dictionary, bodies-library, scoring-rubrics | technical_done.md, hooks_approved | Opus |
| Body Manager | ✓ | body-manager.md | bodies-library, before-afters, scoring-rubrics | flow_done.md | Opus |
| Fathom Checker | ✓ | fathom-checker.md | — | FULL fathom transcript, body_final, hooks_approved, giveaway_approved | Opus |
| Mom Test | ✓ | mom-test.md | — | full script (hooks + body + CTA) | Sonnet |
| Call Supervisor | ✓ | call-supervisor.md | — | brief (full fathom), full script | Sonnet |
| Final Review | ✓ | final-review.md | ALL knowledge-base, slop-dictionary | hooks_approved, body_final, giveaway_approved | Opus |

## Parallel Execution Commands

```bash
# PHASE 2: Research in parallel
claude -p "[YouTube]" --model sonnet &
claude -p "[X/Twitter]" --model sonnet &
claude -p "[Reddit]" --model sonnet &
claude -p "[Industry]" --model sonnet &
wait

# PHASE 3: Hooks + Giveaway in parallel
claude -p "[Hook Writer]" --model opus &
claude -p "[Giveaway Writer]" --model opus &
wait
claude -p "[Hook Manager]" --model opus &
claude -p "[Giveaway Manager]" --model opus &
wait

# PHASE 5: Mom Test + Call Supervisor in parallel
claude -p "[Mom Test]" --model sonnet &
claude -p "[Call Supervisor]" --model sonnet &
wait
```

## Local File Structure

```
~/Desktop/[BRAND]-launch/
├── INDEX.md                    # Pipeline status tracker
│   Format: Step [N]: [✓/running/pending] [agent name]
├── brief.md
├── research/
│   ├── keywords_50.md → keywords_top15.md
│   ├── youtube_default.md, youtube_filtered_12mo.md, youtube_filtered_1mo.md, youtube_api.md
│   ├── reddit_pain.md, industry_data.md
│   ├── x_search_designs.md, x_research.md
│   ├── nugget_base.md, research_brief.md
├── hooks/
│   ├── hooks_draft.md → hooks_approved.md
├── body/
│   ├── body_draft.md → weapons_done.md → controversy_done.md → technical_done.md → flow_done.md → body_final.md
├── giveaway/
│   ├── giveaway_draft.md → giveaway_approved.md, x_giveaway_reference.md
└── final/
    └── final_script.md
```

## Revision Options (all → Tab 4)
- "Punch up hooks" → re-run Hook Writer + Manager
- "More intensity" → re-run Body Writer + specialist chain
- "Different giveaway" → re-run Giveaway Writer + Manager
- "Full second pass" → re-run Phase 3-5 with Tab 3 as starting point
- Specific feedback → route to relevant agent(s)
