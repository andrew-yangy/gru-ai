# Context Tree Redesign — Round 4: CEO Challenges

**Directive:** context-tree-redesign
**Date:** 2026-03-03
**Status:** CEO review required — foundational model questions
**Participants:** Sarah Chen (CTO), Marcus Rivera (CPO), Morgan Park (COO)
**Facilitator:** Alex Rivera (Chief of Staff)

---

## CEO's Three Challenges

1. **Goals vs OKRs — Time Dimension:** Are we conflating permanent domains with time-bound objectives?
2. **Is "Goal" the right tier-1 entity?** Should tier-1 be Area/Domain/Pillar instead?
3. **Project-level slicing:** Do projects need milestones, phases, or roadmap sequencing?

---

## External Research Summary

| Framework | Permanent Layer | Time-Bound Layer | Work Layer | Key Insight |
|-----------|----------------|-----------------|------------|-------------|
| **Linear** | Initiatives (nestable) | Cycles (overlay) | Projects → Issues | Time-boxing is a LENS, not a TIER |
| **PARA** (Tiago Forte) | Areas (ongoing) | Projects (have deadlines) | N/A | Areas and Projects are DIFFERENT THINGS |
| **Perdoo** | Strategic Pillars (KPIs) | OKRs (quarterly) | Initiatives | Pillars measured by KPIs, OKRs by Key Results |
| **Standard OKR** | (implicit) | Objectives (quarterly/annual) | Key Results → Initiatives | OKRs expire and get replaced |
| **Lattice** | Company goals (cascading) | OKRs (time-bound) | Tasks | Goals cascade; OKRs are always time-bound |

**Core pattern across all frameworks:** There is always a separation between permanent domains (areas/pillars) and time-bound targets (OKRs/objectives). The question is whether this separation requires distinct tiers or can be handled within a single tier via schema fields.

---

## Agent Responses

### Challenge 1: Goals vs OKRs — Time Dimension

**Unanimous agreement: the current model conflates permanence with time-boundedness.**

All three agents confirmed the CEO's instinct is correct. Our "goals" are permanent domains (BuyWisely, agent-conductor) that will never "complete," yet our OKR objects embedded inside them have no time period, no expiry date, and no quarterly reset mechanism.

| Agent | Diagnosis | Proposed Fix |
|-------|-----------|-------------|
| **Sarah** | "OKRs without a period field are just wishes." The data model is missing temporal semantics. Current KRs are achievement checklists, not time-scoped objectives. | Enrich OKR schema: add `period`, `expires`, `cycle` fields. Add separate `kpis[]` array for ongoing health metrics (Perdoo-style KPI/OKR split). |
| **Marcus** | "Time-boxing should be a LENS overlaid on the hierarchy, not a TIER within it." Linear's model applies directly. The fix is schema enrichment, not structural surgery. | Add `period`, `expires`, `cycle` fields to OKR objects. Keep embedded in goal.json. Dashboard renders cross-goal time-filtered view. |
| **Morgan** | "We accidentally built Areas with achievement lists, not Goals with OKRs." All 14 KRs in agent-conductor were marked ACHIEVED and just sit there as historical records with no time context. | Extract OKRs to an orthogonal overlay: `.context/cycles/2026-Q1.json` that references features across areas. Kill embedded OKRs. |

**Where they diverge:** Sarah and Marcus want to keep OKRs embedded (with better schema). Morgan wants to extract them to a separate orthogonal layer (like Linear's Cycles). The split is:

- **Embedded + enriched (Sarah, Marcus):** Keep the 3-tier hierarchy clean. Add period/expires/cycle to OKR objects inside the tier-1 entity. OKRs stay co-located with their domain. Dashboard queries across goals for time-filtered views.
- **Extracted overlay (Morgan):** Create `.context/cycles/` as a separate directory. Cycle files reference features across areas. OKRs become a cross-cutting lens, not a nested entity. Matches Linear's architecture.

**Synthesis on Challenge 1:** The team agrees on the problem (no time semantics) but proposes two solutions. The simpler fix is Sarah/Marcus's embedded enrichment (adds 3 fields, no new files). Morgan's overlay is architecturally cleaner but adds a new entity type and risks the "optional directory that rots" problem she herself identified. **Recommendation: embedded enrichment (majority position), with the cycles/ pattern documented as a future escape hatch if cross-area objective tracking becomes necessary.**

---

### Challenge 2: Is "Goal" the Right Tier-1 Entity?

**The team is split 2-1 on naming. Unanimous on NOT adding a 4th tier.**

| Agent | Rename? | 4th Tier? | Reasoning |
|-------|---------|-----------|-----------|
| **Sarah** | YES — rename to "Area" | NO | "Calling them 'goals' creates confusion: 'achieve the buywisely goal' is meaningless because buywisely is an ongoing area." Renaming during the clean-slate migration costs 1x now vs 10x later. |
| **Marcus** | NO — keep "Goal" | NO | "'Goal' is the right word precisely BECAUSE it's ambiguous. A solo founder's goals naturally blend permanent domains with aspirational objectives. That ambiguity is a FEATURE." Four tiers would double navigation and triage complexity. |
| **Morgan** | YES — rename to "Area" | NO | "Goals imply achievement and completion, but these never complete." The rename is cheap — sed across ~15-20 files. But the 4th tier is operationally expensive for 3 areas with max 10 features each. |

**The consensus on 4th tier is absolute: NO.** All three independently concluded that Area → Goal/OKR → Project → Task would be over-engineering for a solo founder. Key arguments:

- **Sarah:** "For a solo founder with 2-4 areas and 2-3 OKRs each, a dedicated OKR tier is pure waste."
- **Marcus:** "Every tier is a tax. Four tiers forces the user to distinguish between 'the area I care about' and 'the thing I'm trying to achieve' — a distinction useful in an enterprise OKR review but meaningless when you're the only human."
- **Morgan:** "Adding a tier between areas and features would mean creating 'objective' entities that contain 1-3 features each — the juice isn't worth the squeeze."

**The naming split is 2-1 (rename to Area).**

Sarah and Morgan argue for semantic honesty — these entities ARE permanent domains, not achievable goals. Marcus argues that the ambiguity serves solo founders who don't naturally distinguish between "areas I invest in" and "goals I'm pursuing."

**Synthesis on Challenge 2:** Three tiers is the right depth. No new layers. The naming question comes down to: do we optimize for semantic precision (Area) or for the natural mental model of our user (Goal)? Both are defensible. **This is a CEO call.** The team can implement either naming without structural changes.

---

### Challenge 3: Project-Level Slicing and Roadmap

**Unanimous: flat task lists are sufficient. Projects should gain sequencing, not milestones.**

| Agent | Milestones? | Roadmap? | Proposal |
|-------|------------|----------|----------|
| **Sarah** | NO formal milestones | YES via lightweight fields | Add optional `phase` string label on tasks (visual grouping only). Add optional `sequence` integer on projects (roadmap ordering within a goal). |
| **Marcus** | NO formal milestones | YES via project-level fields | Add optional `sequence` integer on projects. Add optional `depends_on_project` field on projects. "If a project needs milestones, it's too big — split it." |
| **Morgan** | NO formal milestones | YES via depends_on | Add optional `depends_on` field on features/projects (references another feature ID). "The feature list with depends_on IS the roadmap." |

**All three converge on:**
1. **No milestones/phases as formal entities.** Milestones inside projects would create a hidden 4th tier. If a project is large enough to need milestones, split it into multiple projects.
2. **Project sequencing is the real need.** The CEO's instinct about roadmapping is valid — but at the PROJECT level (ordering projects within a goal), not the TASK level (phases within a project).
3. **Lightweight fields, not new entities.** Either `sequence` (integer ordering) or `depends_on_project` (explicit dependency), or both.

**Additional nuance from Sarah:** Tasks could benefit from an optional `phase` string label (e.g., "research", "build", "test") for visual grouping in dashboards. This is cosmetic, not structural — no new entity, just a string field that the dashboard can use for grouping.

**Synthesis on Challenge 3:** Add two optional fields to project.json: `sequence` (integer) for roadmap ordering and `depends_on_project` (string, project ID) for explicit project-to-project dependencies. Optionally add `phase` label to tasks for visual grouping. No milestones entity. No roadmap entity. The existing "split large projects" constraint already handles the milestone use case.

---

## Consolidated Recommendations

### What Changes

| Change | Consensus | Impact |
|--------|-----------|--------|
| OKRs gain time fields (`period`, `expires`, `cycle`) | 3/3 agree | Schema enrichment only |
| Add optional `kpis[]` to tier-1 entity (ongoing health metrics) | Sarah proposes, others neutral | Small schema addition |
| Add `sequence` field to project.json | 3/3 agree | One optional integer field |
| Add `depends_on_project` field to project.json | Marcus + Morgan agree, Sarah neutral | One optional string field |
| Add `phase` label to task objects | Sarah proposes, others neutral | One optional string field |
| Do NOT add a 4th tier | 3/3 agree (high confidence) | No structural change |
| Do NOT add formal milestones | 3/3 agree | No structural change |

### What Needs CEO Decision

| Decision | Options | Team Lean |
|----------|---------|-----------|
| **Naming: Goal vs Area** | (A) Keep "Goal" — ambiguity serves solo founders (Marcus) | 2-1 for rename |
| | (B) Rename to "Area" — semantic honesty, cheapest during clean-slate migration (Sarah, Morgan) | |
| **OKR architecture** | (A) Enriched embedded OKRs with period/expires/cycle (Sarah, Marcus) | 2-1 for embedded |
| | (B) Extracted orthogonal overlay via cycles/ directory (Morgan) | |

### Revised Schema (if all recommendations applied)

**Tier-1 entity (Goal or Area — pending CEO naming decision):**
```json
{
  "id": "buywisely",
  "title": "BuyWisely — Price Comparison Platform",
  "status": "active",
  "category": "product",
  "description": "Australia's price comparison platform.",
  "created": "2026-01-01",
  "updated": "2026-03-03",
  "kpis": [
    {
      "id": "kpi-1",
      "metric": "Monthly Active Users",
      "target": "10,000",
      "current": "3,200",
      "unit": "users"
    }
  ],
  "okrs": [
    {
      "objective": "Grow subscription revenue to $5k MRR",
      "period": "Q1-2026",
      "expires": "2026-03-31",
      "cycle": "quarterly",
      "key_results": [
        {
          "id": "kr-1",
          "description": "Launch premium tier with price alerts",
          "target": "100 subscribers",
          "current": "0",
          "status": "in_progress"
        }
      ]
    }
  ]
}
```

**Project entity (enriched):**
```json
{
  "id": "subscription-tier",
  "title": "Premium Subscription Tier",
  "goal_id": "buywisely",
  "status": "active",
  "priority": "p1",
  "sequence": 1,
  "depends_on_project": null,
  "description": "Launch premium tier with price alerts and saved searches.",
  "tasks": [
    {
      "id": "t1",
      "title": "Design pricing page",
      "status": "completed",
      "phase": "design",
      "agent": null,
      "depends_on": [],
      "created": "2026-03-01",
      "completed": "2026-03-02"
    },
    {
      "id": "t2",
      "title": "Build Stripe integration",
      "status": "in_progress",
      "phase": "build",
      "agent": "jordan",
      "depends_on": ["t1"],
      "created": "2026-03-02"
    }
  ],
  "created": "2026-03-01",
  "updated": "2026-03-03"
}
```

### What Stays the Same

- **Three-tier hierarchy** (Area/Goal → Project → Task) — no 4th tier
- **Projects under goals on the filesystem** — directory nesting unchanged
- **Tasks embedded in project.json** — no separate task files
- **Directives, backlog, intel, lessons, reports** — all unchanged from Round 3
- **Direct file reading (no indexer)** — unchanged
- **Migration plan** — same structure, just adjust for any renames

---

## Confidence Assessment

All three agents responded with **high confidence** in their recommendations. The 3-tier hierarchy is the strongest consensus point across all four rounds of brainstorming. The only genuine open question is naming (Goal vs Area) — and both options work structurally.

---

*This document captures CEO challenges and team responses. Pending: CEO decisions on naming and OKR architecture. After those decisions, the Round 3 Final spec will be updated to produce the definitive specification.*
