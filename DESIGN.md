---
name: Tamales Lupita
description: A phone-first daily production and sales ledger for a single food counter.
colors:
  service-blue: "#2563eb"
  service-blue-deep: "#1d4ed8"
  service-blue-soft: "#dbeafe"
  cool-counter-gray-50: "#f9fafb"
  cool-counter-gray-100: "#f3f4f6"
  cool-counter-gray-200: "#e5e7eb"
  cool-counter-gray-300: "#d1d5db"
  cool-counter-gray-500: "#6b7280"
  cool-counter-gray-600: "#4b5563"
  cool-counter-gray-700: "#374151"
  cool-counter-gray-900: "#111827"
  surface-white: "#ffffff"
  success-green: "#16a34a"
  success-green-deep: "#15803d"
  danger-red: "#dc2626"
  danger-red-deep: "#b91c1c"
  attention-amber: "#b45309"
  attention-amber-soft: "#fef3c7"
typography:
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 2rem
  headline-wide:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 2.25rem
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.75rem
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5rem
  body-small:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.25rem
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1rem
    letterSpacing: "0.025em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  12: "48px"
components:
  button-primary:
    backgroundColor: "{colors.service-blue}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.service-blue-deep}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.cool-counter-gray-600}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
    height: "44px"
  button-success:
    backgroundColor: "{colors.success-green-deep}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.danger-red}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.cool-counter-gray-900}"
    rounded: "{rounded.md}"
    padding: "12px"
    height: "44px"
  segmented-option-selected:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.service-blue}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  badge-pending:
    backgroundColor: "#fef9c3"
    textColor: "#854d0e"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-fulfilled:
    backgroundColor: "{colors.service-blue-soft}"
    textColor: "#1e40af"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-completed:
    backgroundColor: "#dcfce7"
    textColor: "#166534"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-cancelled:
    backgroundColor: "{colors.cool-counter-gray-200}"
    textColor: "{colors.cool-counter-gray-600}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: Tamales Lupita

## Overview

**Creative North Star: "The Counter Ledger"**

The interface behaves like a well-kept counter ledger: a quiet gray page, white sheets of information, and figures that are easy to read at a glance with a thumb on a phone. Structure carries the design. There is almost no ornament, no marketing voice, and no decoration competing with the next number the counter needs.

Its density is deliberate: one narrow column, one card per job, and tables that turn each variety into a row with a quantity and an action. Color is scarce and semantic, so a blue number, a green total, or an amber warning can be trusted before the label is read.

The system is practical and unfussy. It favors native system type, standard rounded controls, and a soft lift under white cards over any custom visual language. That restraint is correct for a tool used during service, often one-handed, where familiarity is faster than novelty.

**Key Characteristics:**
- Single narrow column, mobile-first, centered on a cool gray page.
- Persistent brand header above and five-job bottom navigation below the content.
- White cards with 20–24px padding and a soft resting shadow.
- Service Blue reserved for primary actions and live quantity figures.
- Green for money and success, red for shortages and negative differences, amber for attention and pending state.
- Large 44px touch targets with the primary action within thumb reach.
- System sans-serif type with bold headings and compact uppercase labels.
- A 4/8/12/16/24/32/48 spacing scale that separates jobs more than it separates fields.
- Rounded 8px controls, 12px cards, and pill-shaped status badges.

## Colors

A cool, restrained operational palette: one blue accent, semantic green/red/amber, and a cool gray scale. Color communicates state; it does not decorate.

### Primary
- **Service Blue** (#2563eb): Primary buttons, active segmented options, live quantity counts, and interactive focus borders. It is the only general-purpose accent.
- **Service Blue Deep** (#1d4ed8): Hover state for primary actions.
- **Service Blue Soft** (#dbeafe): The "Surtido" status badge and other low-emphasis blue fills.

### Neutral
- **Cool Counter Gray 50** (#f9fafb): Table headers, zebra hover rows, and inset summary panels.
- **Cool Counter Gray 100** (#f3f4f6): The page background behind every card.
- **Cool Counter Gray 200** (#e5e7eb): Row dividers, table borders, and inactive badges.
- **Cool Counter Gray 300** (#d1d5db): The 2px stroke on input fields.
- **Cool Counter Gray 500** (#6b7280): Secondary labels, timestamps, and helper text.
- **Cool Counter Gray 600** (#4b5563): Secondary button fill, body labels, and desaturated quantities.
- **Cool Counter Gray 700** (#374151): Table headings and secondary-button hover.
- **Cool Counter Gray 900** (#111827): Primary text and bold figures.
- **Surface White** (#ffffff): Cards, inputs, and selected segments.

### Tertiary
- **Success Green** (#16a34a): Large success fills and the green family anchor.
- **Success Green Deep** (#15803d): Confirming actions and small green text that must clear 4.5:1 on white.
- **Danger Red** (#dc2626): Shortages, negative differences, deletions, and error emphasis.
- **Attention Amber** (#b45309): Pending orders, mismatched records, and caution text.
- **Attention Amber Soft** (#fef3c7): Background fill for pending and warning badges.

### Named Rules
**The One Job Per Color Rule.** Blue means primary action or live quantity. Green means money or success. Red means shortage or negative difference. Amber means attention or pending state. Never use a semantic color for decoration.

**The Quiet Page Rule.** The page stays Cool Counter Gray 100 and the work happens on white cards. Do not introduce colored page backgrounds, gradients, or large accent fields.

## Typography

**Display Font:** System sans-serif stack (`-apple-system`, `Segoe UI`, `Roboto`, `Helvetica Neue`, sans-serif)
**Body Font:** Same system stack
**Label/Mono Font:** Same system stack, uppercase for micro-labels

**Character:** Invisible and fast. The type is the operating system's own sans, chosen so the interface feels native on the phone already in the user's hand. Weight, not family, creates hierarchy.

### Hierarchy
- **Display** (700, 30px / 2.25rem, 1.875rem on desktop): Page title inside the left-aligned page header.
- **Headline** (700, 24px / 2rem): Page title on small screens and top-level section headings.
- **Title** (700, 20px / 1.75rem): Card headings such as "Resumen del Día" and modal titles; `18px` for compact sub-sections.
- **Body** (400, 16px / 1.5rem): Inputs, buttons, table content, and general copy.
- **Body Small** (400–600, 14px / 1.25rem): Secondary facts, row metadata, and inline summaries.
- **Label** (600, 12px / 1rem, 0.025em, uppercase): Table column headers and micro-labels such as "MÉTODO DE PAGO".
- **Figure** (700, 16–32px, tabular feel by alignment): Quantities and money. Blue for counts, green for totals, gray for neutral sums.

### Named Rules
**The Weight Does the Work Rule.** Keep one family. Establish hierarchy with weight and size, not with additional typefaces. Headings are 700, supporting labels 600, and body 400.

**The Uppercase Only for Labels Rule.** Reserve uppercase and letter-spacing for short structural labels and table headings. Never set sentences, buttons, or quantities in uppercase.

## Layout

A single-column, phone-first layout centered in `max-w-2xl` (672px). The page uses 16px horizontal gutters on mobile and 24px from the `md` breakpoint. A persistent shell carries the identity and navigation: a sticky white header with the Tamales Lupita name and business date, and a fixed five-job bottom navigation for Hoy, Venta, Pedidos, Corte, and Historial. The active job is marked with Service Blue and `aria-current`.

The main column uses 20px vertical rhythm between jobs (`page-stack`) and 8/16px inside a group. Cards use 20–24px internal padding with no default outer margin. Tables sit flush inside cards with `p-0`, a 50-level gray header, 12px vertical row padding, and 1px dividers. Section headings sit closer to their content than to the previous group.

Touch targets never fall below 44px for primary inputs and buttons; the fixed bottom bar is at least 56px tall plus the safe-area inset. Desktop expansion is limited to a wider title and max width; the information architecture stays single-column.

## Elevation & Depth

Soft ambient lift. The page is flat Cool Counter Gray 100, and white cards sit just above it with a small diffuse shadow. Depth is a quiet cue that a surface is a discrete record, not a decorative effect. Tappable whole-card surfaces and links lift further on hover or focus; informational cards stay still.

### Shadow Vocabulary
- **Resting card** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): Every white card at rest.
- **Hover lift** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): Whole-card buttons and links on hover.
- **Selected segment** (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`): The white thumb inside a segmented control.
- **Toast** (`box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15)`): Floating notifications only.

### Named Rules
**The Lift Means Tappable Rule.** A shadow change on hover is reserved for surfaces that are themselves controls. Static cards do not animate or lift.

**The Two-Level Rule.** Use only two depth levels: card at rest and card raised on interaction. Do not stack shadows or invent intermediate elevations.

## Shapes

Rounded and friendly without being playful. Controls use an 8px radius (`rounded-lg`), cards use 12px (`rounded-xl`), and status badges are full pills. Segmented-control thumbs use a tighter 6px radius. Inputs carry a 2px gray stroke; everything else is borderless or separated by a 1px divider. Buttons compress slightly on press (`scale(0.98)`) rather than changing shape.

There is no clipping, no diagonal geometry, and no decorative border treatment. The recurring silhouette is the simple rounded rectangle, repeated at three sizes.

## Components

### Buttons
- **Shape:** 8px radius, 44px minimum height, 24px horizontal and 12px vertical padding.
- **Primary:** Service Blue fill, white 600-weight text. Used for the next step and the main screen action.
- **Secondary:** Gray 600 fill, white text. Used for navigation and cancel/dismiss actions.
- **Success:** Green 700 fill (`#15803d`), white text. Used for confirming a sale, surtir, saving a corte, and increment steppers. The deeper green keeps normal-size white text above 4.5:1.
- **Danger:** Red 600 fill, white text. Reserved for destructive actions.
- **Hover / Focus:** Filled buttons darken one step; primary inputs show a Service Blue border. Pressed buttons scale to `0.98`. Disabled buttons drop to 60% opacity and keep their shape.
- **Compact variants:** In-row steppers reduce padding but remain square-ish and thumb-sized. Small navigation buttons use `py-2 px-4` with 14px text.

### App Shell / Navigation
- **Header:** Sticky white surface with a 1px gray-200 bottom border. Brand name at 16px/700, sublabel at 12px, business date at 12px on the right.
- **Bottom Navigation:** Fixed white bar with a 1px gray-200 top border, five equal jobs, 20px SVG icons, and 12px labels. Active job uses Service Blue and `aria-current="page"`. The bar respects `env(safe-area-inset-bottom)`.
- **Page Header:** Left-aligned title at 24–30px/700 with a single 14–16px description. No eyebrow or kicker above the title.

### Chips / Badges
- **Style:** Full pills, 12px semibold text, 2px vertical and 8px horizontal padding.
- **State:** Pending is soft yellow with dark amber text; Surtido is soft blue with deep blue text; Vendido is soft green with dark green text; Cancelado is gray 200 with gray 600 text. "Pedido" markers reuse the soft amber treatment.

### Cards / Containers
- **Corner Style:** 12px radius.
- **Background:** White on the Cool Counter Gray 100 page.
- **Shadow Strategy:** Resting card shadow; hover lift only for tappable cards.
- **Border:** None by default; warning callouts may add a 1px amber or yellow border.
- **Internal Padding:** 20–24px. Tables use a full-bleed card with `p-0` and internal row padding. Inset summary panels use gray-50 without a shadow; they are not cards nested inside cards.

### Inputs / Fields
- **Style:** White fill, 2px Cool Counter Gray 300 stroke, 8px radius, 16px text, 44px minimum height.
- **Focus:** Border shifts to Service Blue; no glow or ring.
- **Disabled / Error:** Disabled controls are not specially styled beyond reduced affordance; errors are communicated in red text below or above the control and through toasts.
- **Labels:** 14px medium gray-600 text above the field; required fields append an asterisk.

### Day Overview
- **Surface:** One white overview card per day, not a grid of six miniature cards.
- **Content:** Six readings at most: produced, sold, pending, available, cash, and close state. Counts use gray-900 or Service Blue; money uses green; close state uses its semantic color.
- **Action:** One primary next step in the header, pulled from the day state (register production, fulfill orders, sell, or close the register).

### Tables
- **Structure:** Full-width, flush inside a card, with a 50-level gray header and 1px row dividers.
- **Header:** 12–14px semibold gray-700 labels, left-aligned for names and centered for quantities.
- **Rows:** 12px vertical padding, hover gray-50, and an optional red-tinted background for sold-out rows.
- **Mobile:** Type drops to 14px and horizontal padding tightens below 640px.

### Segmented Control
- **Style:** Gray 100 track with 4px padding and an 8px radius; each option is a 6px-radius segment.
- **State:** Selected option is white with Service Blue text and a small shadow; unselected options are gray-600 text. Used for payment method and deposit choice.

### Modals
- **Style:** Centered white card over a 50% black overlay, max width 448px, max height 85vh with vertical scroll.
- **Behavior:** Clicking the overlay closes; clicking the card does not. Close uses a plain gray "×" with an accessible label.
- **Content:** Title, optional subtitle, item list with 1px dividers, totals separated by a 2px top border, then a two-button action row.

## Do's and Don'ts

### Do:
- **Do** keep the page background Cool Counter Gray 100 and put content on white cards.
- **Do** reserve Service Blue for primary action, live quantities, and focus; keep its coverage low.
- **Do** keep interactive targets at least 44px tall.
- **Do** use 12px card radius and 8px control radius consistently.
- **Do** use 20–24px card padding, a 20px stack between jobs, and 8/16px internal stacks.
- **Do** pair every count with a plain-language label, and every money total with `success-green-deep`.
- **Do** use the system sans stack; establish hierarchy with weight and size.
- **Do** keep the five jobs in the persistent bottom bar and mark the current one.
- **Do** give every screen a single primary action in the day overview or the form footer.
- **Do** let a page title stand on its own; no eyebrow or kicker above it.

### Don't:
- **Don't** introduce gradients, large colored background fields, or decorative accent colors.
- **Don't** use blue, green, red, or amber for ornament; each one has a fixed operational meaning.
- **Don't** add a second typeface or a display font.
- **Don't** use shadows beyond the resting card, hover lift, selected segment, and toast.
- **Don't** set paragraphs, buttons, or quantities in uppercase.
- **Don't** shrink primary actions below 44px or hide them behind menus.
- **Don't** replace the semantic color system with a monochrome palette; the colors are part of the ledger's legibility.
- **Don't** soften the utilitarian tone with illustrations, mascots, or marketing copy.
- **Don't** add eyebrows, kickers, or section numbers above headings.
- **Don't** use emoji or Unicode glyphs as the icon system; use authored SVG icons.
- **Don't** nest a card inside another card; use a gray-50 inset panel without shadow when a summary needs separation.
