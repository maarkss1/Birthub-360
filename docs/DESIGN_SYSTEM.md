# Birth Hub 360º — Design System

This design system defines the foundation for the Birth Hub 360º commercial intelligence platform. It relies on Semantic Tokens (`--brand`, `--on-brand`, `--ink`, `--surface`…) to construct a unified "Command Center" aesthetic that adapts to light/dark theme. Until 09/2026 the same tokens also carried a runtime `activeBrand` swap between two separate brands — that mechanism is gone; see `.claude/PILOTS.md`, Piloto 033.

## Principles

1.  **Executive Transparency**: High data density managed through clear hierarchy and ample structural padding, eschewing excessive drop shadows for modern glassmorphism (backdrop blurs with structural 1px borders).
2.  **Token discipline**: components read generic CSS custom properties (`--brand`, `--brand-2`, `--on-brand`, `--bg`, `--surface`) instead of raw colors, so the whole surface reacts to light/dark — and a future palette change stays a one-file edit. Until 09/2026 these same tokens also carried a runtime swap between two brands; that swap is gone, the discipline is not.
3.  **Shapes & Geometry**: Using consistent 8px radiuses (`rounded-lg`) for primary interactive controls (Buttons, Inputs, Badges) and 16px radiuses (`rounded-2xl`) for larger layout containers (Cards, Modals).

## Color Strategy

- **Birth Hub 360º**: driven by `--brand: #D4AF37` (Antique Gold) and `--brand-2: #EBD689` (Gold Soft), with `--iris: #5B21B6` and `--orbit-blue: #0065D2` reserved for halos/indicators, against Obsidian/Snow White neutrals. Any solid `bg-brand` surface pairs with `--on-brand` (Obsidian) for text — gold is a light color, white text on it fails contrast. See `docs/BrandConstitution.md`.
- **Semantic Layer**: Usage of `--color-ok` (success), `--color-warn` (warning), `--color-danger-base` (error), and `--color-info-base` (information) applied across the badge component.

## Component Implementation

- **Button**: Gradient overrides were replaced with solid brand colors, focusing on hover interactions that alter brightness rather than hardcoding a specific brand's gradient.
- **Card**: Elevated structures now rely on `--surface-elevated` along with subtle translucent borders (`border-t-white/40 border-b-black/5`) to generate depth.
- **Layout**: The application canvas shifted from decorative glowing orbs to a minimalist `bg-bg`, keeping the focus strictly on data and operations.
