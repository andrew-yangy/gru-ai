# 小红书 Platform Research -- gruAI Content Strategy

## 1. Content Format Specifications

### Image Notes (图文笔记)

| Spec | Value |
|------|-------|
| Max images per carousel | 18 (vs Instagram's 10) |
| Recommended image size | 1242 x 1660 px |
| Max image size | 1280 x 1706 px |
| Min image size | 300 x 600 px |
| Aspect ratio range | 3:4 (portrait, preferred) to 4:3 (landscape) |
| Cover image | First image in carousel -- shown in discovery feed |

### Video Notes (视频笔记)

| Spec | Value |
|------|-------|
| Max duration | 15 minutes |
| Recommended duration | 1--5 minutes (sweet spot: 2--3 min for tutorials) |
| Optimal resolution | 1080p (1920x1080) or 1080x1440 |
| Recommended format | 9:16 vertical (full-screen mobile) |
| Alternative format | 1:1 square |
| File format | MP4 with H.264 encoding |
| Audio codec | AAC or MP3 (128--256 kbps) |
| Max file size | 1 GB (recommended: 100--300 MB) |

### Text & Hashtags

| Spec | Value |
|------|-------|
| Title character limit | 18 characters (Chinese) |
| Body text limit | 1,000 characters |
| Recommended body length | 600--800 characters for engagement |
| Max hashtags per post | 10 |
| Hashtag placement | End of body text, each prefixed with # |

**Practical note for gruAI posts:** 1,000 characters in Chinese is roughly 500
words of English content. This is tight -- screencast posts should rely on
visuals + voiceover, not long captions. Use the caption for hook + CTA +
hashtags, put details in carousel slides or voiceover.

## 2. Algorithm & Discovery Signals

### Engagement Signal Hierarchy (strongest to weakest)

1. **Saves (收藏)** -- highest weight. Indicates reference value. gruAI
   tutorials and cheat sheets will index well here.
2. **Shares (分享)** -- user actively recommending content to someone else.
3. **Comments (评论)** -- signals conversation value. Ask questions in CTAs.
4. **Likes (点赞)** -- lowest weight. Easy to get, low signal.

### Content Distribution Process

1. **Pre-scan:** AI-powered semantic analysis checks quality, formatting,
   grammar, keyword relevance, visual appeal.
2. **Traffic pool trial:** New post shown to 100--500 users. Engagement
   measured against baseline.
3. **Expansion:** If engagement exceeds threshold, post enters progressively
   larger pools (1K, 10K, 100K+).
4. **Suppression triggers:** Overly promotional language, low visual quality,
   clickbait without substance.

### Account-Level Factors

- **180-day rule:** Accounts under 180 days get limited visibility. Start
  posting immediately to build history -- do not wait for "perfect" content.
- **Post consistency:** Regular posting (3x/week minimum) increases baseline
  exposure.
- **User trust score:** Organic interactions > purchased engagement. Never buy
  followers or engagement.
- **Niche focus:** Algorithm rewards topical consistency. Pick 1--2 content
  pillars early, branch later.

### Key Implications for gruAI

- **Optimize for saves:** Make content reference-worthy (cheat sheets, setup
  guides, comparison tables). The pixel-art office GIF is inherently
  save-worthy -- use it in every relevant post.
- **Trigger comments:** End posts with specific questions ("你会用AI agent来做
  什么?" not generic "关注我").
- **Keep under 180-day radar:** Post consistently from day one. Do not wait 6
  months to "accumulate content." The first 180 days build trust score.

## 3. Developer/Tech Content That Performs Well on 小红书

小红书 has become a significant hub for developer content, especially AI and
indie development. Key data points:

- **50,000+ indie developers** actively posting on the platform
- **Developer content grew 146% year-over-year**
- **500M+ topic views** for developer-related content
- 小红书 launched its **first Independent Developer Awards** in April 2025

### Example 1: SunAlly (AI mental health companion)

- **Format:** Developer diary posts (图文笔记)
- **Result:** 20,000 users acquired in 2 months, driven entirely by organic
  小红书 content
- **Why it worked:** Shared the building journey, not just the product.
  Authentic "behind-the-scenes" of AI development resonated with users.
- **Takeaway for gruAI:** The "AI agents running a company" narrative is a
  perfect developer diary format.

### Example 2: Cocktail Notes (recipe app)

- **Format:** Feature request threads + developer diary
- **Result:** Incorporated 400+ user suggestions before launch. Won first
  Independent Developer Award.
- **Why it worked:** Developer publicly incorporated feedback in every version
  release note. Users felt co-ownership of the product.
- **Takeaway for gruAI:** Post "changelog" content showing agent improvements,
  invite feature requests.

### Example 3: #独立开发反馈日记 (Indie Dev Feedback Diaries)

- **Format:** Hashtag community with 3,000+ conversations
- **Result:** Built a self-sustaining ecosystem of developer content
- **Why it worked:** Standardized format (diary + feedback loop) made content
  easy to produce and discover.
- **Takeaway for gruAI:** Create a recurring series format with a consistent
  hashtag. #AI自动化公司 or #gruAI开发日记.

### Emerging Pattern: "Grass-planting" (种草) for Dev Tools

小红书's culture centers on peer recommendations ("种草" -- planting seeds of
interest). Developer content that shows real workflow improvements -- screen
recordings of before/after -- triggers the same "I want this too" response
that product reviews do. gruAI's pixel-art office visualization is a natural
种草 trigger: it is visually unique and immediately communicates what the tool
does.

## 4. AI Voiceover Tool Comparison

### Evaluation Criteria

For gruAI screencast posts, the voiceover tool must:
- Produce natural Mandarin Chinese with correct tones
- Support API access for automation (future batch content production)
- Handle technical vocabulary (agent, pipeline, directive, TypeScript)
- Stay within budget for 12+ posts/month

### Comparison Table

| Tool | Chinese Quality | Pricing | API | Best For | Rec |
|------|----------------|---------|-----|----------|-----|
| **Volcengine TTS (火山引擎)** | Excellent -- native Chinese platform, emotional voices, TikTok-grade quality | Standard: 5.5 RMB/1K calls (~$0.75); Long-text: 1 RMB/10K chars (~$0.14) | Yes -- REST API, mature SDK | High-volume Chinese content with native-sounding delivery | **Top pick** |
| **ElevenLabs** | Good -- Multilingual v2 handles Mandarin tones, accent options (Beijing, Taiwanese) | Starter $5/mo (30K chars); Creator $22/mo (100K chars); Pro $99/mo (500K chars) | Yes -- REST API, well-documented | International teams, voice cloning, multilingual content | Runner-up |
| **Azure Neural TTS** | Good -- 500+ voices, multiple Chinese variants (Mandarin, Wu, Cantonese) | $16/1M chars (~$0.016/1K chars) | Yes -- Azure SDK, enterprise-grade | Enterprise workflows, custom neural voice ($24/1M chars) | Solid option |
| **HeyGen** | Good -- 175+ languages, AI avatar + voice combo | Free: 3 videos/mo; Creator: $24/mo; API: ~$1/min | Yes -- API available | Talking-head avatar videos (not pure voiceover) | Niche use |
| **Speechify** | Decent -- 60+ languages, natural tone | API: $10/1M chars; Consumer: $139/year | Yes -- REST API | Reading/narration use cases, budget option | Budget pick |

### Recommendation

**Primary tool: Volcengine TTS (火山引擎)**

- Best Chinese voice quality -- built by ByteDance, trained on TikTok/Douyin
  voice data
- Cheapest at scale -- $0.14/10K characters for long-text synthesis
- Emotional voice variants -- can match content tone (energetic for demos,
  calm for tutorials)
- Familiar to Chinese audience -- voices sound like popular Douyin narrations

**Secondary tool: ElevenLabs**

- Use for English-language content or bilingual posts
- Voice cloning capability -- clone the CEO's voice for authenticity (requires
  Pro plan)
- Better documentation and developer experience than Volcengine

**HeyGen for avatar videos only:** If gruAI ever produces talking-head
explainer videos (a person explaining the framework), HeyGen is the tool. Do
not use it for screencast voiceover -- it is overkill and expensive.

## 5. Screencast Recording Guide

### Recommended Tools

| Tool | Platform | Cost | Best For |
|------|----------|------|----------|
| **OBS Studio** | macOS/Win/Linux | Free, open-source | Full control, scene switching, overlays |
| **ScreenFlow** | macOS only | $169 one-time | Polished editing, zoom/callout effects |
| **QuickTime** | macOS built-in | Free | Quick captures, no editing needed |

**Recommendation:** OBS Studio for recording (free, supports scenes and
overlays), ScreenFlow for post-production editing (zoom effects on code,
callout annotations). QuickTime for quick one-off captures.

### Recording Settings for 小红书

| Setting | Value | Rationale |
|---------|-------|-----------|
| Resolution | 1080 x 1920 (9:16 vertical) | Full-screen mobile on 小红书 |
| Frame rate | 30 fps | Smooth enough for screencasts, keeps file small |
| Bitrate | 8--12 Mbps | Good quality without exceeding 300 MB for 3-min video |
| Output format | MP4 (H.264 + AAC) | Native to 小红书 upload |
| Aspect ratio | 9:16 (vertical, primary) or 3:4 (alternative) | 9:16 gets full-screen placement |

### Recording Workflow for gruAI Screencasts

1. **Set up OBS canvas:** 1080x1920 vertical. Create scenes for:
   - Terminal with gruAI commands (font size 18+ for mobile readability)
   - Browser showing pixel-art office (game running full screen)
   - Split screen: terminal left + office right

2. **Font and UI prep:**
   - Terminal font: 18px minimum (will be viewed on phone screens)
   - Increase VS Code / editor zoom to 150%+
   - Use a dark theme with high contrast -- small screens crush detail
   - Hide macOS dock and menu bar for clean capture

3. **Recording tips:**
   - Record at 1920x1080 (horizontal), then crop/reframe to 1080x1920
     (vertical) in post -- gives more flexibility than recording vertical
   - Alternatively, use OBS virtual canvas at 1080x1920 directly
   - Keep each scene 15--30 seconds -- 小红书 videos need fast pacing
   - Add text overlays in post-production (ScreenFlow or CapCut) -- do not
     rely on terminal text being readable

4. **Post-production:**
   - Add Chinese text overlays for key points
   - Use CapCut (剪映, also by ByteDance) for final editing -- integrates
     well with 小红书 and has built-in Chinese subtitle generation
   - Add background music from 小红书's royalty-free library
   - Export: MP4, H.264, 1080x1920, 30fps, AAC audio

### 小红书-Specific Video Best Practices

- **Hook in first 3 seconds** -- show the pixel-art office or a terminal
  command executing immediately. Do not start with a title card.
- **Text overlays are mandatory** -- most users browse with sound off. Every
  key point needs a text callout.
- **Moderate-to-fast pacing** -- cut dead time aggressively. If a command
  takes 10 seconds to run, speed-ramp it to 2 seconds.
- **Vibrant color grading** -- 小红书's feed is visually competitive. The
  pixel-art office already has strong colors; make sure terminal screenshots
  use a vibrant dark theme (e.g., Dracula, Tokyo Night).

---

*Research compiled 2026-03-08. Platform specs may change -- verify against
小红书 Creator Center (创作者中心) before production.*
