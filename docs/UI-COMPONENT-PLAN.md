# UI component plan

Which BeUI (B) and VengeanceUI (V) components each page uses. Hand-roll only where neither has a fit. Never use BeUI Casino.

Rules that apply everywhere:

- **Motion vs GSAP.** GSAP stays on the home page scroll (`src/lib/gsap.ts`, `components/home/*`). Every other page uses Motion (BeUI imports `motion/react`, Vengeance and our code import `framer-motion`: same runtime, `motion@14.11.1` wraps `framer-motion@14.11.1`). Never put a GSAP component and a Motion component in one component tree.
- **Be selective.** A component goes in only if it fits the content and the quiet, education-first tone. One accent (brand orange), sentence case, no em dashes in copy.
- **Name clashes.** BeUI `Button`, `Input`, `Alert`, `Tabs` share names with `@/components/ui` and Vengeance. Import with an alias, e.g. `import { Input as MotionInput } from "@/components/beui/input"`.
- **Default buttons stay ours.** `Button`/`ButtonLink` from `@/components/ui` remain the normal buttons. Use BeUI `StatefulButton` only for async submits.
- **Wave agents do not install.** Anything not in "Wave 1 installed" needs a separate install pass (procedure below).

## Registry setup

`web/components.json`:

```json
"registries": {
  "@vengeanceui": "https://raw.githubusercontent.com/Ashutoshx7/VengeanceUI/main/public/r/{name}.json",
  "@beui": "https://beui.dev/r/{name}.json"
}
```

BeUI catalogue: https://beui.dev/r (JSON), https://beui.dev/llms.txt (index), docs at `https://beui.dev/components/<category>/<page>.md`. Install names are registry slugs, which differ from doc page slugs (the "Button" page ships `button-base`, `button-stateful`, `button-magnetic`, `button-metallic`; "Text animation" ships `text-reveal`, `text-shimmer` and others; "Number" ships `number-ticker`, `animated-number`, `digit-swap`; "Scroll animation" ships `scroll-reveal`, `scroll-progress`, `parallax`, `smooth-scroll`, `scroll-to`).

### Install procedure for BeUI (do not run plain `shadcn add` in `web/`)

Two traps in this repo:

1. `tailwind.cssVariables` is `false`, so the shadcn CLI rewrites semantic classes (`bg-background`, `text-muted-foreground`, `bg-primary`) into broken strings like `bg-oklch(1 0 0)`.
2. BeUI items write to `@lib/utils.ts` (clashes with ours), `@lib/ease.ts`, `@lib/i18n.tsx`, `@lib/hooks/*` and `@components/motion/*`.

So:

1. Run `pnpm dlx shadcn@latest add @beui/<name> --yes` in a scratch project to confirm the file list, or read it from `https://beui.dev/r/<name>.json`.
2. Copy each file's `content` from the registry JSON (untransformed source): `components/motion/*` goes to `src/components/beui/*`, `lib/*` goes to `src/components/beui/lib/*`. Skip `lib/utils.ts` (identical `cn` already in `@/lib/utils`).
3. Rewrite imports: `@/lib/{ease,i18n,presence-gate,hooks/...}` becomes `@/components/beui/lib/...`, `@/components/motion/` becomes `@/components/beui/`.
4. Add npm deps with `pnpm add` (most items need only `motion`, `clsx`, `tailwind-merge`, `lucide-react`, all present).
5. Re-skin (below), then `npx eslint src/components/beui` and `npx tsc --noEmit -p .`.

### Re-skin rules (already applied to installed files)

- `bg-muted` becomes `bg-muted-bg` (our `muted` is the secondary text colour).
- Primary fills: `bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700`, semibold labels (white on orange needs 14 px semibold).
- Info and loading tones: `bg-brand-50 text-brand-700 border-brand-200`. Success: `success`/`success-50`. Errors: `danger`/`danger-50` (the shadcn `destructive` var does not flip in dark mode).
- Shapes follow the design system: buttons and inputs `rounded-xl`, inputs `h-11 bg-card` with `border-brand-500 ring-brand-500/30` focus.
- Segmented and pill tabs: `bg-muted-bg` track, `bg-card shadow-sm dark:bg-input` thumb, `text-ink` active label. Underline tabs: 2 px `bg-brand-500`.
- Dark mode comes from the tokens under `.dark`. Do not add `dark:` colour overrides.

## VengeanceUI inventory (`src/components/vengeance/`, lint-ignored)

- **Primitives (Radix/shadcn style):** accordion, alert, aspect-ratio, avatar, badge, breadcrumb, button, button-group, calendar, card, carousel, chart (recharts), checkbox, collapsible, command, context-menu, dialog, drawer (vaul), dropdown-menu, empty, field, form, hover-card, input, input-group, input-otp, item, kbd, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, spinner, switch, table, tabs, textarea, toggle, toggle-group, tooltip.
- **Effects, Motion-based:** agent-bento-grid, animated-button, animated-number, animated-tooltip, creepy-button, cursor-card, cyber-glitch-text, diagonal-carousel, expandable-bento-grid, flip-fade-text, fluid-morph-bg, folder-preview, gooey-search, image-trail, masked-avatars, morphing-disclosure, notch-navbar, perspective-carousel, pricing-section, pricing-tiers, research-bento-grid, shared-tooltip-avatars, social-flip-button, spotlight-navbar, staggerText, stats-counter, testimonials-card.
- **Effects, GSAP-based (home only, if ever):** animated-footer, awwwards-nav, circular-gallery, glass-dock, gooey-text-reveal, image-scatter, reveal-loader, staggered-grid, verse-cards.
- **Effects, three.js/shaders (avoid: heavy):** interactive-particles, liquid-metal, liquid-ocean, liquid-text, wave-grid-background.
- **Effects, CSS only:** animated-rays, ascii-glitch-ripple, aurora-hero, border-beam, candy-button, code-block, copy-button, corner-button, elastic-stack, faq-accordion, flip-text, footer, fullscreen-preview, generate-button, github-button, glow-border-card, highlight-grid, image-reveal-list, interactive-book, interactive-hover-button, interactive-keyboard, kinetic-text-loader, light-lines, line-hover-link, liquid-gradient, logo-slider, mega-menu-navbar, morph-text, music-player, perspective-grid, pixelated-image-trail, pop-button, search-modal, share-sheet, smooth-scroll, stacked-logos, team-reveal-grid, testinomial-card2, twisting-ribbon, typing-keyboard.

Already used: sheet (app shell), table, empty, skeleton, tabs, progress, switch, dropdown-menu, chart, stats-counter, border-beam, faq-accordion, staggerText.

## Wave 1 pages

### Public nav (`components/layout/public-nav.tsx`)
- **SharedLayoutBg** (B, `@/components/beui/shared-layout-bg`): a hover pill that glides between the desktop links. Use `as="ul"` with `li` children. The active link keeps `text-brand-600`.
- **Sheet** (V, `@/components/vengeance/sheet`, `side="right"`): the mobile menu. It is the same primitive as the app shell's "More" sheet and gives focus trap and scroll lock for free.
- Keep `ThemeToggle` (ours already uses View Transitions) and `ButtonLink`.

### Public footer (`app/(public)/layout.tsx`)
- **SharedLayoutBg** (B, `as="ul"`, small `inset` such as 8): the same hover pill as the nav, behind each link column, wrapping `next/link`. Footer and nav share one hover vocabulary.
- Not V LineHoverLink: it renders a plain `<a>` (full page loads instead of client navigation) and injects a `<style>` tag per link.
- Keep the layout server-rendered: put the link columns in a small client component. No reveal animation in the footer.

### Login and register (`app/(auth)/*`)
- **Input** (B, `@/components/beui/input`): label, error shake and message, and `reserveErrorLine` so zod errors don't shift the card. Use `rightIcon` for an Eye/EyeOff password reveal. `onChange` receives the string, not the event. Replaces `Field` + `Input` for these fields.
- **StatefulButton** (B, `@/components/beui/button/stateful`): submit goes `loading`, then `success` just before `router.replace`, and `error` on failure. Pass `loadingText="Signing in"` etc. to set sentence-case copy.
- **Alert** (B, `@/components/beui/alert`, `variant="destructive"`): the form-level error, which animates in and out instead of jumping.
- Keep `GoogleButton`/`Divider` and the auth layout's `animate-fade-up`.

### About (`app/(public)/about`)
- **staggerText** (V, `TextAnimation` default export): the H1 entrance, the same treatment as the home hero.
- **ScrollReveal** (B, `@/components/beui/scroll-reveal`): the principles grid, with a small `delay` per card (`i * 0.06`).

### Contact (`app/(public)/contact`)
- **Input** (B): name, email and subject. Keep `Textarea` from `@/components/ui` for the message, because BeUI Input has no multiline mode. Both use the same brand focus ring.
- **StatefulButton** (B): "Send message", which goes sending, then sent.
- **Alert** (B): `success` replaces the form once sent; `destructive` shows API errors.

### Programs (`app/(public)/programs`)
- **staggerText** (V): the H1.
- **ScrollReveal** (B): the program cards.
- **Tabs** (B, `@/components/beui/tabs`, `variant="pill"`): optional. Add the level filter (All, School, College, University) only if the list grows past four cards.
- Hand-roll the roadmap line (Python, AI fundamentals, ML, deep learning, projects) as a static step rail. BeUI Timeline is a draggable rail for dated events and doesn't fit.

### Learning levels (`app/(public)/levels`)
- **Tabs** (B, `variant="segment"`): School / College / University switches one detail panel (tutor, projects, assessment). Use it below `lg` at least; on `lg` either keep the three-column comparison or use tabs throughout.
- **ScrollReveal** (B): the panels.

### Features (`app/(public)/features`)
- **staggerText** (V): the H1.
- **ScrollReveal** (B): staggers the nine-card `FeatureGrid`.
- **Tabs** (B, `variant="underline"`): optional grouping (Learn, Grow, Support) if the page gains per-feature detail. Skip it for a plain grid.

### Public opportunities (`app/(public)/opportunities`)
- **AnimatedBadge** (B, `@/components/beui/animated-badge`, `status="success"`): a "Verified by our team" badge next to the heading.
- **Empty** (V, `@/components/vengeance/empty`): the "listings are being prepared" state, the same component the app pages use.
- **ScrollReveal** (B): the category list and the empty state.
- The category chips stay static: they are not interactive, so no component.

## Later waves (not installed yet; install names in brackets)

### Shared
- **App shell:** SharedLayoutBg (B, installed) for the sidebar hover; keep V Sheet for "More". The active item stays `bg-brand-50`.
- **Toasts:** keep V sonner. Skip B animated-toast-stack.
- **404:** hand-roll a kite-themed page. The BeUI not-found blocks (glitch, terminal, magnetic) are off tone.

### Setup
- **Onboarding:** B Input, B StatefulButton, V Progress for the steps. Consider B Radio (`radio`) for the level cards only if it keeps native arrow-key and "1 of 3" announcements. Keep the interest chips hand-rolled (`aria-pressed` toggles).

### Student app
- **Dashboard:** keep V stats-counter for numbers and V Skeleton. No BeUI chart until real trend data exists.
- **Learning Center (`/learn`), course page:** B Tabs for filters, B AnimatedBadge for Demo/completed, B Collapsible (`collapsible`) for long lesson lists.
- **Lesson page:** B Scroll progress (`scroll-progress`, bar at top). Pass `progress` from Motion's `useScroll()` so it doesn't need Lenis.
- **AI Tutor:** B AI Agents set: Prompt input (`prompt-input`), Message (`message`), Message scroller (`message-scroller`), Thinking shimmer (`thinking-shimmer`), Citations (`citations`, for RAG sources), Code block (`code-block`, uses shiki, already a dep). The prompt input replaces the V border-beam.
- **Assessment (take):** B Radio (`radio`) for the answer options, B StatefulButton for submit, V Progress for question position.
- **Assessment results:** keep V stats-counter and V chart (recharts) for the score by topic. B AnimatedBadge for strengths and gaps.
- **Roadmap:** B ScrollReveal; hand-roll the stage rail; keep V stats-counter.
- **Project Lab, challenge, project:** B Tabs (challenges / my projects), B AnimatedBadge for review status, B Input for the Colab/GitHub URL, B StatefulButton for submit.
- **Opportunity Hub:** B Tabs (matched / saved / applied), B Multi select (`multi-select`) for the category filter, B AnimatedBadge for deadline and verified status, V Skeleton. Detail page: B Tabs `segment` for the application status, B StatefulButton for save.
- **Career Navigator, career detail:** B Tabs (migrate from V tabs when touched), V Progress for the skill gap.
- **Study Planner:** B Heat calendar (`heat-calendar`, adds `@floating-ui/dom`, small) for the streak; B Tabs `segment` for the focus-timer mode; B Digit swap (`digit-swap`) for the timer digits; B StatefulButton for adding a task.
- **MindCare:** keep it calm. B StatefulButton for saving a check-in, B Alert. Keep the mood picker and history bars hand-rolled (no celebratory motion). Never share components that read mood data with dashboard code.
- **Skill Passport:** B AnimatedBadge for verified items, V CopyButton for the share link, V ShareSheet (optional).
- **Notifications:** B Tabs (migrate from V tabs), B AnimatedBadge for unread.
- **Settings:** B Input, B Switch (`switch`), B StatefulButton, B Alert.
- **Google Workspace:** B AnimatedBadge for connected / not configured, B StatefulButton for connect and disconnect.

### Staff
- **Course authoring (list, editor):** B Sortable list (`sortable-stack`) for lesson order, B Tabs, keep V Switch for publish.
- **Students, student detail:** keep V Table, V Progress and the recharts staff charts.
- **Users, audit log:** keep V Table and V DropdownMenu; add B Pagination (`pagination`) for the audit log and B Combobox (`combobox`) for the actor filter.
- **Verify opportunities:** B AnimatedBadge for verification status, V Calendar for the single deadline date, B StatefulButton for verify.
- **Achievements, MindCare support, announcements:** B StatefulButton, B Alert, B AnimatedBadge.

### Public, other
- **Certificate (`/certificates/[code]`), public passport (`/p/[token]`):** B AnimatedBadge "Verified certificate", B ScrollReveal.

## Wave 1 installed

| Component | Import |
| --- | --- |
| SharedLayoutBg | `import { SharedLayoutBg } from "@/components/beui/shared-layout-bg"` |
| ScrollReveal | `import { ScrollReveal } from "@/components/beui/scroll-reveal"` |
| Input | `import { Input as MotionInput } from "@/components/beui/input"` |
| StatefulButton, ButtonState | `import { StatefulButton, type ButtonState } from "@/components/beui/button/stateful"` |
| Button, ButtonLink (dependency of StatefulButton) | `@/components/beui/button/base` (prefer `@/components/ui` for plain buttons) |
| Alert, AlertIcon, AlertContent, AlertTitle, AlertDescription, AlertAction, AlertClose | `@/components/beui/alert` |
| Tabs, TabsList, TabsTrigger, TabsContent | `@/components/beui/tabs` |
| AnimatedBadge | `import { AnimatedBadge } from "@/components/beui/animated-badge"` |
| Shared helpers | `@/components/beui/lib/ease`, `lib/i18n` (`LocaleProvider` for Bangla strings later), `lib/presence-gate`, `lib/hooks/use-hover-capable` |

New dependency: `motion@14.11.1`, pinned to the installed `framer-motion` so there is one runtime. Vengeance components used above (sheet, staggerText, empty) are already vendored.

## Skipped and why

- **Table, table-editable, table-async** (B): add `@tanstack/react-virtual`, and V Table already covers our row counts.
- **Smooth scroll, scroll-to** (B): page-wide Lenis fights GSAP ScrollTrigger on home and native scroll elsewhere.
- **Shader background, tilt card, magnetic and metallic buttons, chromatic text reveal, text scramble, cylinder carousel, dock, bounce sidebar, preview rail** (B): decorative and off the quiet tone. The home Sky is the site's one rich moment.
- **Theme toggle** (B): ours already does the View Transitions repaint.
- **Drawer, bottom sheet** (B): V Sheet is already the app's overlay primitive.
- **Text reveal** (B): V staggerText is the established headline entrance. Use one style.
- **Dropdown menu, select, popover, tooltip, context menu** (B): V Radix equivalents are in use. B tooltip would also add `@floating-ui/dom`.
- **BeUI charts other than heat calendar** (B): recharts (V chart) already powers the staff and results charts. Don't run two chart systems.
- **Number ticker, animated number** (B): V stats-counter is in use.
- **Sign up form, OTP input blocks** (B): our auth flow is already built on zod plus the API. BeUI Input gives the motion without the block's own logic.
- **Casino** (B): excluded by rule.
- **three.js and shader Vengeance effects:** heavy, and off tone for low-end Android phones.
