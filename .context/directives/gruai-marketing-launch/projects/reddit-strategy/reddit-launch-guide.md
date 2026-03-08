# Reddit Launch Guide -- gruai

## TL;DR

Three subreddits, three angles, three ready-to-post drafts. r/ClaudeCode is the
primary target (exact audience match). r/ChatGPTCoding gets the comparison angle.
r/SideProject gets the builder story. Post on Tuesday/Wednesday mornings US East
Coast time. Do not crosspost. Do not post to r/artificial or r/LocalLLaMA.

---

## 1. Per-Subreddit Analysis

### r/ClaudeCode -- PRIMARY TARGET

| Metric | Value |
|--------|-------|
| Subscribers | ~96K members |
| Weekly active contributors | 4,200+ (3x more than r/Codex's 1,200) |
| Growth trajectory | Rapid -- new subreddit, high activity |
| Self-promotion tolerance | Moderate -- tool posts welcome if genuinely useful |

**What gets upvoted:**
- Technical deep-dives showing real Claude Code workflows (multi-agent pipelines,
  tmux setups, custom skills)
- Developer tools that solve pain points (token usage reducers, security auditors
  for skills, cost analysis tools)
- "I built X with Claude Code" posts with concrete details -- architecture, cost,
  time spent, lessons learned
- Pain-point discussion (usage limits, pricing, model comparisons)
- Posts with visual demos or GIFs showing real output

**What gets downvoted or flagged:**
- Vague "check out my app" posts with no technical substance
- Posts that read like marketing copy instead of developer sharing
- Anything that looks like it was written by AI without a human angle
- Repeat self-promotional accounts with no community participation

**Posting rules (summary):**
- No explicit anti-promo rule, but community self-polices hard
- Technical substance is the currency -- show code, show architecture, show output
- Engagement with commenters is expected; post-and-ghost kills credibility
- Flair your post appropriately (tools/projects flair exists)

**Spam risk factors:**
- New account posting a tool = moderate suspicion
- Multiple tool posts in short succession = high suspicion
- Not responding to technical questions = death sentence
- Mitigation: the poster's Reddit account must have prior r/ClaudeCode engagement
  (comments, upvotes on others' posts) before the launch post

**Why this is target #1:** gruai is literally built on Claude Code. The audience
is developers who already use Claude Code daily and want better visibility into
what their agents are doing. No other subreddit has this exact overlap.

---

### r/ChatGPTCoding

| Metric | Value |
|--------|-------|
| Subscribers | ~357K members |
| Activity level | High -- active daily discussion |
| Self-promotion tolerance | High -- tool/project posts are common and welcomed |
| Audience overlap with gruai | Partial -- AI coding users, but not Claude-specific |

**What gets upvoted:**
- Tool comparisons (Claude vs GPT vs Gemini for coding tasks)
- "I built X" posts showing AI-assisted development results
- Tips and workflows for coding with AI assistants
- New tools that integrate with multiple AI models
- Cost and efficiency analysis between platforms

**What gets downvoted or flagged:**
- Claude-only cheerleading without acknowledging ChatGPT's strengths
- Pure promotional posts with no technical discussion
- Posts that bash ChatGPT/OpenAI -- the community is multi-tool but leans OpenAI

**Posting rules (summary):**
- Self-promotion explicitly allowed in standalone posts
- Project showcase threads exist but standalone posts perform better
- Tool comparisons are a proven format -- the community loves them
- Flair usage expected

**Spam risk factors:**
- Lower spam sensitivity than r/ClaudeCode -- the community is accustomed to tool posts
- Still need authentic engagement in comments
- Mitigation: frame as "tool comparison" not "Claude Code advertisement"

**Angle for gruai:** Position as an AI agent framework that happens to use Claude Code
today but solves a universal problem (visibility into agent work). Comparison with
Devin, CrewAI, AutoGen, LangGraph gives the post substance. The pixel-art office
is the visual hook that no competitor has.

---

### r/SideProject

| Metric | Value |
|--------|-------|
| Subscribers | ~503K members |
| Activity level | High -- daily new project posts |
| Self-promotion tolerance | Very high -- this is the purpose of the subreddit |
| Audience overlap with gruai | Broad -- builders of all kinds |

**What gets upvoted:**
- Builder stories with emotional arc: problem, journey, result
- Posts that lead with a feeling (curiosity, surprise, recognition) before explaining
  the product
- Visual demos -- GIFs and short videos perform 3-5x better than text-only
- Specific numbers: "built in X weeks", "Y lines of code", "Z stars on GitHub"
- Honest posts about challenges and what did not work

**What gets downvoted or flagged:**
- Pure landing-page links with no story
- Posts that read like press releases
- No visual demo when the product is inherently visual
- Asking for feedback without showing the product

**Posting rules (summary):**
- Self-promotion is the explicit purpose -- no guilt needed
- Seeking feedback framing performs best even when you are actually launching
- Short video or GIF is the top-performing format
- Text posts with inline images also work well

**Spam risk factors:**
- Very low -- the community expects and encourages self-promotion
- Only risk is if the post is obviously AI-generated marketing copy
- Mitigation: authentic builder voice, specific details, honest tone

**Angle for gruai:** The "indie hacker built an AI company framework" story.
Emphasize the journey: why you built it, what the pixel-art office means,
the open-source decision. r/SideProject loves the builder-as-protagonist narrative.

---

## 2. Draft Launch Posts

### Draft 1: r/ClaudeCode

**Title:** I built a pixel-art office that visualizes your Claude Code sessions in real-time

**Flair:** Tools & Projects

**Recommended posting time:** Tuesday or Wednesday, 14:00-15:00 UTC (9-10 AM US Eastern)

**Body:**

```markdown
I've been running multi-agent Claude Code setups for a few months -- CTO, builder,
reviewer agents working on a shared codebase. The problem: I had no idea what was
happening across sessions without tailing 5 terminal windows.

So I built [gruai](https://github.com/andrew-yangy/gruai) -- it watches your
Claude Code session files and renders them as characters in a pixel-art isometric
office. When an agent starts coding, you see them sit at a desk and type. When
they start a review, they walk to the reviewer's desk. Brainstorming? They gather
at the whiteboard.

**What it actually does:**
- Watches `~/.claude/projects/` for active sessions
- Maps agents to pixel-art characters with idle, walking, and working animations
- Shows real-time status: which agent is active, what they're working on, pipeline
  stage (triage -> plan -> build -> review -> ship)
- Runs locally -- `npm install -g gru-ai && gru-ai` to start

**Tech stack:** React 19, TypeScript, Canvas 2D (no game engine), Vite, Express
for the session watcher server.

**Demo:** [GIF of the office in action](docs/assets/demo.gif)

The framework also includes a directive pipeline -- structured triage, planning,
build, and review stages. You define agents in `.claude/agents/*.md` with markdown
templates, and the pipeline handles task decomposition and review gates.

It's MIT-licensed and on npm as `gru-ai`. Happy to answer questions about the
architecture or how the session watcher works.

GitHub: https://github.com/andrew-yangy/gruai
```

---

### Draft 2: r/ChatGPTCoding

**Title:** gruai: an open-source AI agent framework with a pixel-art office -- how it compares to Devin, CrewAI, and AutoGen

**Flair:** Tool / Resource

**Recommended posting time:** Tuesday or Wednesday, 14:00-15:00 UTC (9-10 AM US Eastern)

**Body:**

```markdown
I've been building an autonomous AI agent framework called
[gruai](https://github.com/andrew-yangy/gruai) and wanted to share how it fits
into the landscape alongside tools like Devin, CrewAI, AutoGen, and LangGraph.

**The short version:** gruai gives you a team of AI agents (planner, builder,
reviewer) that work through a structured pipeline, and you watch them do it in a
pixel-art isometric office. Every agent is a character with animations tied to
real session state.

**How it compares:**

| Feature | gruai | Devin | CrewAI | AutoGen |
|---------|-------|-------|--------|---------|
| Agent visualization | Pixel-art office (real-time) | Web dashboard | None | None |
| Pipeline structure | Directive > Project > Task with review gates | Autonomous (black box) | Role-based chains | Conversation patterns |
| Model | Claude Code (Anthropic) | Proprietary | Any LLM | Any LLM |
| Pricing | Free / MIT | $500/mo | Free / open-source | Free / open-source |
| Setup | `npm install -g gru-ai` | Cloud service | pip install | pip install |
| Code review built-in | Yes (reviewer agents) | Limited | Manual | Manual |

**What makes it different:**

1. **You can see your agents work.** Not in a log panel -- in a pixel-art office
   where characters walk to desks, type on keyboards, and gather at whiteboards.
   No other framework has anything like this.

2. **Structured pipeline, not free-form chat.** Every piece of work goes through
   triage -> planning -> build -> review -> completion. Lightweight tasks skip the
   heavy steps automatically. You get review gates, not vibes.

3. **Agent personalities via markdown.** Define a CTO agent in
   `.claude/agents/sarah-cto.md` with specific review standards, and she'll
   enforce them. Change the markdown, change the behavior.

**Demo:** [GIF of the office in action](docs/assets/demo.gif)

Currently built on Claude Code (Anthropic), so it's most relevant if you're
already in that ecosystem or interested in trying it. MIT-licensed, open source.

GitHub: https://github.com/andrew-yangy/gruai
npm: `gru-ai`
```

---

### Draft 3: r/SideProject

**Title:** I built an autonomous AI company framework with a pixel-art office -- gruai

**Flair:** Show Off

**Recommended posting time:** Tuesday or Wednesday, 15:00-16:00 UTC (10-11 AM US Eastern)

**Body:**

```markdown
For the past few months I've been building gruai -- a framework that turns AI
coding agents into a visible, structured team.

The idea came from frustration: I was running multiple Claude Code sessions for
different tasks (planning, building, reviewing code) and had zero visibility into
what was happening. Terminal logs scrolling in 5 windows. No way to tell if Agent A
was blocked waiting for Agent B's review.

**What I built:**

gruai watches your AI coding sessions and renders them as characters in a
pixel-art isometric office. Each agent (CTO, builder, reviewer, planner) has their
own desk, their own animations, and their status updates in real-time. When a
builder starts coding, you see them sit down and type. When a reviewer starts a
code review, they walk over to the builder's desk.

[GIF of the office in action](docs/assets/demo.gif)

But it's more than a visualization. Under the hood there's a full directive
pipeline:

1. **Triage** -- incoming work gets classified by complexity
2. **Planning** -- a planner agent decomposes work into projects and tasks
3. **Build** -- builder agents execute tasks with structured context
4. **Review** -- reviewer agents check work against acceptance criteria
5. **Completion** -- nothing ships without passing review gates

**Tech details:**
- React 19, TypeScript, Canvas 2D (no game engine -- pure pixel pushing)
- Express server watches session files in real-time
- Agents defined as markdown templates -- swap personalities by editing a file
- MIT license, open source, on npm as `gru-ai`

**What I learned building it:**
- Pixel art by LLM is possible but needs heavy human curation -- the AI generates
  sprite sheets but you have to hand-fix proportions and animation frames
- The hardest part was the pipeline, not the visualization -- getting agents to
  reliably follow a multi-step process without losing context
- Canvas 2D is surprisingly capable for isometric rendering -- you do not need
  Phaser or PixiJS for this kind of thing

Would love feedback on the concept and the execution. Particularly interested in
whether the visualization adds real value or is just eye candy.

GitHub: https://github.com/andrew-yangy/gruai
```

---

## 3. Comment Strategy

### First-Hour Engagement Plan

The first 60 minutes after posting determine whether the post lives or dies on
Reddit. Follow this plan:

1. **Minute 0-5:** Post goes live. Immediately open the post in a browser and
   verify formatting, links, and GIF rendering.

2. **Minute 5-15:** Post a "builder's note" comment on your own post -- a short
   (3-4 sentence) comment adding context the body did not cover. Example:
   "One thing I didn't mention -- the agent animations are tied to real session
   state via file watchers, not mocked. If you kill a Claude session, the character
   literally stands up and walks away from their desk."

3. **Minute 15-60:** Monitor for comments. Reply to every comment within 10
   minutes. Technical questions get detailed answers. Skeptical comments get
   honest responses (not defensive). "Nice project" comments get a thank-you plus
   a follow-up question ("Are you running multi-agent setups? Curious what
   visibility you have into them today").

4. **Do not leave Reddit for the first 2 hours.** Early engagement signals to the
   algorithm that the post is worth surfacing.

### Response Templates

**"How is this different from Devin?"**

> Good question. Devin is a cloud-hosted autonomous agent -- you give it a task
> and come back later. gruai is the opposite model: local agents you can watch
> work in real-time. Devin is a black box at $500/mo. gruai is MIT-licensed, runs
> locally, and the whole point is visibility into what the agents are doing. Also,
> gruai uses Claude Code under the hood, so you get Anthropic's models rather than
> a proprietary system. Different philosophies -- Devin is "fire and forget," gruai
> is "watch and steer."

**"How is this different from CrewAI / AutoGen / LangGraph?"**

> CrewAI and AutoGen are excellent multi-agent orchestration frameworks, but
> they're Python-first and focus on the orchestration layer -- defining roles,
> chains, and conversation patterns. gruai is TypeScript/Node, built specifically
> on Claude Code, and adds two things they don't have: (1) a visual pixel-art
> office where you see your agents work, and (2) a structured pipeline with
> built-in review gates (triage -> plan -> build -> review -> ship). If you're
> already in the Claude Code ecosystem and want visibility, gruai fills a gap
> those frameworks don't address.

**"Is it just a wrapper around Claude Code?"**

> It started that way, honestly. The session watcher is a thin layer over Claude
> Code's session files. But the pipeline and review system are substantial -- they
> enforce structured workflows that raw Claude Code doesn't. The visualization is
> also non-trivial: pixel-art character rendering, isometric office layout,
> real-time animation state machines, all in Canvas 2D. So "wrapper" undersells
> it, but I understand the skepticism. The best way to judge is to run it.

**"Does it work with GPT / Gemini / other models?"**

> Right now it's Claude Code only. The session watcher reads Anthropic's session
> file format. Supporting other model providers (Codex, Gemini Code, etc.) is
> possible in theory -- the visualization layer is model-agnostic -- but it's not
> on the roadmap yet. If there's demand, I'd consider it.

**"Is the pixel-art just a gimmick?"**

> Fair question. The pixel-art office is the attention-grabber, but the real value
> is the information it encodes: which agent is active, what stage of the pipeline
> they're in, whether they're blocked. Without it, you're tailing log files. With
> it, you glance at a window and know your team's status. Whether that's a
> "gimmick" depends on whether you value at-a-glance visibility. For me, running
> 3-5 agents on a shared codebase, it's not optional.

**"Cool project! How long did it take?"**

> A few months of evenings and weekends. The hardest part was the pipeline
> (getting agents to reliably follow multi-step processes), not the game
> rendering. Canvas 2D is surprisingly capable for isometric pixel art.

### Tone Guidance

- **Be a developer sharing work, not a company launching a product.** First person
  singular ("I built"), not corporate ("we are excited to announce").
- **Acknowledge limitations honestly.** "Right now it's Claude Code only" is stronger
  than dodging the question. Developers respect honesty about constraints.
- **Show curiosity about the commenter's setup.** "What are you using for multi-agent
  visibility today?" turns a Q&A into a conversation.
- **Never be defensive.** If someone says "this is just a wrapper," respond with
  substance, not emotion. List the non-trivial parts. Let the work speak.
- **Do not use marketing language.** No "revolutionary," "game-changing,"
  "disrupting." Developers can smell marketing copy from a mile away.
- **Match the subreddit's register.** r/ClaudeCode is technical and direct.
  r/ChatGPTCoding is broader and more casual. r/SideProject is supportive and
  story-oriented.

---

## 4. Posting Guide

### Timing Recommendations

| Subreddit | Best day | Best time (UTC) | Best time (US Eastern) | Rationale |
|-----------|----------|-----------------|------------------------|-----------|
| r/ClaudeCode | Tue/Wed | 14:00-15:00 | 9-10 AM | Developer work hours, peak browsing before standup |
| r/ChatGPTCoding | Tue/Wed | 14:00-15:00 | 9-10 AM | Same dev-audience pattern |
| r/SideProject | Tue/Wed | 15:00-16:00 | 10-11 AM | Slightly later -- indie builders browse mid-morning |

**Avoid:** Friday afternoons, weekends, Monday mornings (low developer engagement).

**Spacing:** Post to r/ClaudeCode first (primary audience). Wait 24-48 hours before
posting to r/ChatGPTCoding. Wait another 24-48 hours before r/SideProject. This
avoids crosspost detection and lets you refine the message based on r/ClaudeCode
feedback.

### Do-Not-Do List

1. **Do not crosspost.** Each subreddit gets a unique post tailored to its audience.
   Reddit's crosspost feature makes it obvious and reduces engagement.

2. **Do not use a fresh account.** The posting account must have prior activity in
   the target subreddit -- at minimum a few genuine comments over a few weeks.

3. **Do not astroturf.** No alt accounts upvoting or commenting on your own post.
   Reddit's detection is sophisticated and the penalty is a shadowban.

4. **Do not use engagement pods.** No coordinated upvote groups. Reddit detects
   these and suppresses the post.

5. **Do not post and ghost.** If you don't engage with comments for the first 2
   hours, the post will die regardless of content quality.

6. **Do not edit the post title after posting.** Reddit does not allow title edits.
   Triple-check the title before posting.

7. **Do not use link posts.** Use text posts with inline links. Text posts get
   higher engagement on developer subreddits because they signal effort.

8. **Do not include more than 2 links in the body.** GitHub repo + npm/demo is
   enough. More links trigger spam filters.

9. **Do not use AI-generated writing without heavy editing.** Developers on these
   subreddits are attuned to LLM-style prose. The post must sound like a human
   wrote it. Short sentences. Specific details. Imperfect grammar is fine.

10. **Do not ask for upvotes or stars.** "Star us on GitHub" as a call-to-action
    is acceptable in moderation but "please upvote" will get you flagged.

### Explicit Exclusion: r/artificial and r/LocalLLaMA

**r/artificial (~1.3M members):**
- Excluded because the community focuses on AI news, ethics, and industry trends --
  not developer tools or project showcases.
- Tool posts get buried under news articles and opinion pieces.
- High spam volume means aggressive moderation; tool posts by new accounts are
  frequently removed.
- The audience is not developers building with Claude Code -- it's a general
  AI-interested audience.

**r/LocalLLaMA (~750K members):**
- Excluded because the community is focused on running open-weight models locally
  (Llama, Mistral, Qwen, etc.).
- gruai uses Claude Code (a proprietary API-based model). Posting a proprietary-
  model tool in a community dedicated to open models will get negative reception.
- The community actively pushes back on closed-source / API-dependent tools.
- If gruai adds open-model support in the future, r/LocalLLaMA becomes relevant.
  Not today.

---

## Prerequisites Before Posting

- [ ] Reddit account has 2+ weeks of genuine activity in r/ClaudeCode (comments,
      upvotes on others' posts)
- [ ] docs/assets/demo.gif is current and shows the latest office rendering
- [ ] GitHub repo is renamed to `gruai` and README is polished
- [ ] npm package `gru-ai` is published and `npm install -g gru-ai` works
- [ ] All links in draft posts are tested and resolve correctly
- [ ] GIF loads when pasted into a Reddit text post (test in draft mode)
- [ ] Post body is manually reviewed for AI-sounding language and edited to sound
      natural
