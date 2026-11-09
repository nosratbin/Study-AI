# LEARN AI Design System (Figma-ready spec)

Style: modern EdTech, white + orange, minimal, mobile-first. Source of truth for web tokens:
`web/src/app/globals.css` (`@theme`). Components: `web/src/components/ui/index.tsx`.

## Color tokens

| Token | Hex | Use |
|---|---|---|
| brand-500 (Primary) | `#F97316` | Primary buttons, active nav, progress, focus ring |
| brand-600 | `#EA580C` | Hover, eyebrow text |
| brand-700 | `#C2410C` | Pressed, text on brand-50 |
| brand-50 / 100 / 200 | `#FFF7ED` / `#FFEDD5` / `#FED7AA` | Tinted backgrounds, selected states, borders |
| ink (Dark text) | `#172033` | Headings, body |
| muted (Secondary gray) | `#64748B` | Secondary text, icons |
| surface (Background) | `#F8FAFC` | App background |
| white | `#FFFFFF` | Cards, nav |
| line | `#E2E8F0` | Borders, dividers |
| success | `#16A34A` | Completed, verified |
| danger | `#DC2626` | Errors |

Contrast: ink on white 15.4:1; muted on white 4.8:1; white on brand-500 3.0:1 — so primary buttons use **semibold 14px+** labels (WCAG AA large/UI); use brand-700 for orange body text.

## Typography

Inter (Latin) with Noto Sans Bengali fallback for Bangla.

| Style | Size / line height | Weight |
|---|---|---|
| Display | 48 / 56 (mobile 36 / 44) | 700 |
| H1 | 30 / 36 (mobile 24 / 32) | 700 |
| H2 | 24 / 32 | 700 |
| H3 / card title | 16 / 24 | 600 |
| Body | 15–16 / 24 | 400 |
| Small | 14 / 20 | 400–500 |
| Caption | 12 / 16 | 500 |

## Spacing, radius, elevation

- 4 px grid; common steps 8, 12, 16, 20, 24, 32, 48, 56.
- Page gutter 16 px mobile, 24 px desktop; max content width 1152 px.
- Radius: inputs/buttons 12 px, cards 16 px, chips/badges full.
- Card shadow: `0 1px 2px rgba(23,32,51,.04), 0 4px 16px rgba(23,32,51,.04)` + 1 px `line` border.

## Components

| Component | Variants / states |
|---|---|
| Button | primary, secondary, ghost, danger · sm 36 / md 44 / lg 48 px · loading (spinner), disabled |
| Input / Select / Textarea | 44 px height · default, focus (brand ring), invalid (danger border + message) |
| Field | label, optional tag, hint, error |
| Card | white, 16 px radius, border + shadow |
| Badge | brand, neutral, success |
| Alert | error, success |
| Progress | 8 px bar, brand fill |
| EmptyState | icon, title, helper text, dashed border |
| Level selector | 3 radio cards; selected = brand border + brand-50 fill |
| Interest chips | toggle; on = brand fill, white text |

## Layout

- **Public**: sticky top nav (collapses to menu < 1024 px), hero, feature grid (1/2/3 cols), footer.
- **App (desktop ≥ 1024)**: 256 px left sidebar, content max 1152 px.
- **App (mobile)**: top bar + 5-item bottom nav — Home · Learn · AI Tutor · Opportunities · Profile; 64 px tall plus safe-area inset.
- Modules that aren't released yet show as disabled items with a "Soon" label, never as dead links.

## Motion

- Page/section entrance: fade-up 6 px, 350 ms ease-out.
- Colour transitions 150 ms; progress width 500 ms.
- All motion is disabled under `prefers-reduced-motion`.

## Icons

lucide icons, 16–20 px, 1.75–2 px stroke, `muted` by default and `brand-500` for emphasis.
