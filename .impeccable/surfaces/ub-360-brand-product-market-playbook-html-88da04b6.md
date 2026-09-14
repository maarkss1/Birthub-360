---
version: 1
slug: "ub-360-brand-product-market-playbook-html-88da04b6"
primary_target: "docs/strategy/BIRTH_HUB_360_BRAND_PRODUCT_MARKET_PLAYBOOK.html"
related_targets: []
---

# Surface brief — Strategy Playbook (docs/strategy/BIRTH_HUB_360_BRAND_PRODUCT_MARKET_PLAYBOOK.html)

## Scope & visitor mode

Standalone HTML document (not a screen of the live Birth Hub 360 product). Visitor mode: **Experience** leading into **Persuade** — the reading experience itself is the product for the opening chapters (book, page by page), converging on a persuasive close (convite/próximo passo) for the appendix reader who came back to check a fact.

## Audience, job, action, proof, constraints

- Audience: futuros compradores (decisores comerciais B2B avaliando Birth Hub 360) reading top-to-bottom for the first time, plus the same audience returning later to check a specific reference fact (ICP, objeção, métrica).
- Job: understand what Birth Hub 360 is, believe it is different in a way that matters to their own operation, and know the next step.
- Action: no live conversion form exists in this artifact — the "action" is comprehension + a stated next step (contact channels already in brand.ts) and, secondarily, staying to browse the appendix.
- Proof: real product mechanism already documented in `docs/strategy/birth-hub-360-strategy.json` (agentic governance, RLS multi-tenant, real integrations) — every claim in the narrative chapters must trace back to that JSON's CONFIRMED/RECOMENDAÇÃO fields, never invented.
- Constraints: 100% Portuguese (explicit user correction — previous English section titles were rejected); real brand tokens only (Antique Gold/Deep Iris/Orbit Blue/Obsidian/Snow White, Bodoni Moda + Inter) even though the user's visual reference file used an invented palette/fonts; must open directly from disk (file://), no build step; JSON stays the single source of truth, referenced not duplicated verbatim as prose everywhere.

## Chosen direction (brief-pinned, concept-seed not run)

Concept-seed dice-roll skipped deliberately: the user's request is precisely specified (exact structural form — "livro, abrindo página por página" — exact language constraint, and a supplied visual reference), matching new-work.md §3's "never run the script for... a precisely specified narrow request; shape those directly."

### Direction contract

**THESIS:** The playbook stops being a technical reference dashboard and becomes an editorial digital book — each section is a page you turn, not a band you scroll forever through; the category default (SaaS command-center, fixed sidebar, infinite scroll) is refused.

**OWN-WORLD:** Real brand palette only — Antique Gold `#D4AF37` (protagonist, always paired with dark text, never white-on-gold), Deep Iris `#5B21B6`, Orbit Blue `#0065D2`, Obsidian `#0B132B` (base/ground), Snow White `#F8FAFC`. The one authorized multicolor gradient — the 360º orbit (gold→iris→blue) — powers the cover emblem and chapter dividers only, never a text background. Typography: Bodoni Moda (display/chapter titles, high contrast serif, restrained italic for emphasis) + Inter (body/captions/UI). Subtle glass-card treatment (translucent surface + blur) for in-page content blocks; an orbital halo/emblem with concentric rings and a "B" monogram carrying a restrained metallic gold gradient — sober, no neon, no flashing glow loops.

**STORY:** The reader (a prospective commercial buyer) opens the cover, feels the brand's weight/authority (emblem, tagline), is carried through a first-person-feeling narrative from the real problem (fragmented commercial data) to the turning point (Birth Hub 360 as command center), meets the one true differentiator (agents with defined roles + auditable governance) as the story's secret hero, recognizes themselves in "Para quem é", gains trust in the proof/governance chapter, feels the ambition in the vision chapter, and closes on a clear next step. From there they may keep turning pages into a denser reference appendix (the prior content, now framed as "quer o detalhe? continue lendo").

**FIRST VIEWPORT (cover):** Full-bleed, Obsidian ground, the orbital halo (gold→iris→blue rings) centered as the dominant element around a metallic-gold "B" monogram, "Birth Hub 360" in large Bodoni Moda with a restrained metallic gradient, tagline below in Inter, a quiet "Abrir o livro" affordance with a page-corner/arrow cue. No technical sidebar nav visible on the cover — that lives inside the book behind a table-of-contents affordance.

**FORM:** Paginated digital book — one page visible at a time, occupying most of the viewport, with a page-turn transition (slide + slight perspective) on navigation via edge clicks, on-screen prev/next controls, keyboard arrows, and mobile swipe; a running "Página X de Y" counter; a table-of-contents accessible as a slide-in panel/drawer to jump to any chapter directly. No free-scroll through the whole history — each chapter is its own page (dense appendix chapters may be a short paginated sub-sequence, still turned one at a time, not scrolled).

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved decisions

- Exact number/boundary of appendix sub-pages per reference chapter (personas, objections, etc.) — resolved during build by chunking each JSON array into readable page-sized groups (not spec'd numerically here).
- No image generation confirmed available in this environment → code-led build; no comp round. Emblem/halo built in CSS/SVG, not a generated raster.
