# Changelog

All notable changes to MiseMap are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — April 2026

### 🎉 Initial Release

#### Added
- **Raw Materials** — full ingredient library with buy unit, pack cost, qty per pack, usage unit, unit conversion, and 7 nutritional values (calories, carbs, protein, fats, fiber, sugar, caffeine)
- **Intermediates** — prep recipe builder (sauces, marinades, bases, stocks) built from raw materials; cost and nutrition auto-calculated from ingredients proportionally
- **Menu Items** — full recipe builder using raw materials and/or intermediates; live food cost, sell price, delivery price, and FC% calculated in real time as recipe is built
- **Smart Pricing Engine** — three-tier override system (global → category → per-item) for SP multiplier, packaging cost, and delivery markup; cascade update modal when global values change
- **FC% Alerts** — configurable threshold; colour-coded badges (green / orange / red) across dashboard and menu list; dedicated alert panel for breached items
- **AI Suggest** — powered by Anthropic Claude; auto-fills category, sub-category, food type, buy/usage units, conversion ratio, and all 7 nutritional values from an ingredient name
- **Dashboard** — live overview of all menu items with food cost, sell price, delivery price, and FC%; stat cards for totals and alerts
- **Search & Filter** — search by name or category across all pages; category filter dropdown on menu items
- **Shared database** — all data stored in Supabase and shared across entire team in real time
- **Settings page** — global defaults table, category overrides table, per-item overrides table with visual highlight of active overrides

---

## Upcoming / Planned

- Export to Excel / PDF (menu costing report)
- Printable menu sheet with sell prices
- Multi-user access controls (role-based: admin / editor / viewer)
- Ingredient price history and cost change alerts
- Inventory integration
- Bulk import from CSV

---

*MiseMap is built and maintained by [Sayv Ilahsiav](https://apps.sayvilahsiav.com)*
