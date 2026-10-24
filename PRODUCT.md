# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The owner and counter staff of **Tamales Lupita**, a single-location food business. They use the app during service at the counter, mostly one-handed on a phone, to record the day's production and sales, hold customer orders, and close the cash register. The owner also reviews prior days to understand what was produced, sold, and collected.

## Product Purpose

Give the business a daily record that connects production to money. Staff register how many pieces of each variety were made, record walk-in sales and customer orders, and then reconcile the expected cash against what was actually counted. Success means a completed daily close whose expected amount matches the reported amount, with any difference explained rather than hidden.

## Positioning

Production-to-cash control: the app ties produced pieces per variety to sold pieces, reserved customer orders, deposits, and the expected cash amount. A notebook or generic point-of-sale records transactions but does not expose the gap between what was made and what was sold and collected.

## Operating Context

- One stand, Spanish-language interface, Mexican pesos (MXN).
- Service happens at the counter on a phone; speed and one-handed touch use matter.
- The day starts with production recorded by variety, then walk-in sales and customer orders.
- Customer orders can be reserved with a deposit, tracked until pickup, and then sold against the reserved quantity so they are not double-counted.
- Payments are recorded as cash or bank transfer.
- The day ends with a cash cut comparing expected versus reported amounts, with optional notes.
- Past days are reviewed for production, sales, and cut history.

## Capabilities and Constraints

- Existing app: Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma over PostgreSQL (Neon), deployed on Vercel.
- Routes cover daily production, sales, orders, cash cut, and history.
- The product catalog and prices may change over time. The current six seeded varieties at one shared per-piece price are present-day data, not a permanent constraint.
- Current domain records: daily production by variety, products with price, sales and sale items, orders and order items with deposits and statuses, and one cash register record per day.
- Payments are cash or transfer; no card-terminal integration exists.
- Two databases are used: a development database locally and a production database on Vercel; credentials never live in the repository.

## Brand Commitments

- Business name: **Tamales Lupita**.
- Spanish is the product's language.
- The current generic app title, "Control de Ventas", is not itself a brand commitment; future work should treat Tamales Lupita as the identity to preserve.

## Evidence on Hand

- Real product code and seeded catalog exist in this repository.
- No customer testimonials, press, benchmarks, pricing claims, or marketing assets are present. Future work must not fabricate them.

## Product Principles

1. Make the daily close trustworthy: every produced piece should trace to a sale, a reservation, or an explained leftover.
2. Optimize for the counter, not the desk: the next action must be reachable quickly with one hand on a phone.
3. Keep operational language in Spanish and in the business's own terms.
4. Preserve history as recorded; corrections should be explicit, not silent rewrites.
5. Let the catalog evolve without assuming a fixed set of varieties or a single price.
