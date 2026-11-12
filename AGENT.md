# AGENT.md — project map for AI coding agents

Read this before exploring. It covers the layout, commands, conventions and gotchas, so you only open the files your task needs.

## What this is
**قطعه ترب (PartTorob)**: "Torob for car parts". It crawls shops, normalizes messy Persian listings, matches them into products, ranks results by user intent with explanations, checks fitment against the user's car, sends maintenance reminders, offers an AI assistant, and hands buyers off to the seller (click-out, no cart). It has three roles: customer, seller and admin. The UI is Persian and RTL.

## Layout
```
backend/   FastAPI + SQLAlchemy 2 + Pydantic 2 (Python 3.12)   → :8000, docs at /docs
frontend/  Next.js 15 App Router + React 19 + Tailwind v4 (TS)  → :3000 (also the BFF)
docs/      architecture.png/.svg, how-it-works.png/.svg
.claude/   launch.json (servers "qatee-api", "qatee-web"), skills/
```

### backend/app
| Path | Role |
|---|---|
| `main.py` | app + lifespan: `catalog.reindex()` → `seed_demo_users` → `seed_population` → `apply_all_overrides` |
| `core/config.py` | `Settings` (env / `backend/.env`): DB URL, OTP knobs, `ai_mode`, `claude_model` |
| `core/schema.py` | `Schema` base: snake_case in Python, **camelCase on the wire** |
| `core/text.py` | Persian normalization (`normalize_text`), digits, `format_toman` |
| `db.py` | ORM: `User, Vehicle, ServiceRecord, OtpCode, AuthSession, OfferOverride, ClickOut`; `init_db()` = `create_all` + `_add_missing_columns()` (adds new nullable columns in place) |
| `seed.py` | Deterministic demo data: 3 fixed accounts, ~60 customers, shop owners, 30 days of click-outs |
| `api/deps.py` | `DB`, `CurrentUser`, `UserId` (login required), `OptionalUserId` (guests allowed), `AdminUser`, `SellerUser` |
| `api/routes/` | `auth` · `catalog` (meta, me, search, products) · `garage` · `commerce` (go click-out, assistant) · `seller` · `admin` |
| `modules/ingestion/` | `sources/market.py` (simulated shops, `TRUTH` products, `SELLERS`), `normalize.py`, `pipeline.py` |
| `modules/catalog/` | `taxonomy.py` (groups, categories, BRANDS lexicon), `models.py`, `repository.py` (in-memory index, `apply_override`) |
| `modules/search/` | `intent.py` (query → intent; `priorities` stack: cheap/quality/fast/warranty), `ranker.py` (additive boosts → normalized weights, score + `reasons`), `__init__.py` (`search_products`: brand filter + `brand_facets`) |
| `modules/compatibility.py` | fitment: explicit platform or spec match (oil viscosity, plug code, battery Ah) |
| `modules/vehicles.py` | 9 models, `body_type`, specs, per-model maintenance rules, `detect_vehicles` |
| `modules/garage.py`, `maintenance.py` | garage rules (max 4, odometer never decreases), due-status engine |
| `modules/auth.py` | OTP (HMAC hash, TTL, lockout, resend gap), sessions, `SmsSender` port |
| `modules/seller_portal.py`, `admin_portal.py` | panel read models and commands |
| `modules/assistant/` | Claude tool-use agent (`agent.py`) + deterministic `fallback.py` |

### frontend/src
| Path | Role |
|---|---|
| `middleware.ts` | public: `/`, search, product, compare, go, shop, login/signup; everything else → `/login?next=` |
| `lib/api.ts` | server-side client (`api.*`), forwards session as Bearer; 401 → `/login` (`meOptional` returns null) |
| `lib/types.ts` | wire types (mirror the Pydantic schemas, camelCase) |
| `lib/session.ts`, `app/session/route.ts` | httpOnly `tm_session` cookie (login / logout) |
| `app/api/[...path]/route.ts` | browser → FastAPI proxy |
| `app/go/[productId]/[sellerId]/route.ts` | click-out: log, then 302 to the seller |
| `app/shop/…` | demo storefront (simulated shops have no real site) |
| `app/{page,search,product,compare,garage,assistant,login,signup,seller,admin}` | pages (Server Components) |
| `components/art/` | SVG art: `CarArt` (5 body types), `PartArt` (per category), `TireChange` (login animation) |
| `components/PriceTrend.tsx`, `lib/price.ts` | daily / 7 / 30 / 90-day price change UI |

## Commands
```bash
# backend
cd backend && .venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
cd backend && .venv/Scripts/python -m pytest -q          # 39 tests, isolated temp DB, AI_MODE=off
# frontend
cd frontend && npm run dev
cd frontend && npx tsc --noEmit -p . && npx eslint src
```
Reset demo data (optional, only for a clean demo): stop the API, delete `backend/data/qatee.db`, then restart. Seeding is deterministic. New **nullable** columns are added automatically on startup, so model changes usually do not need a reset.

Demo logins (the OTP code is shown on screen): admin `09120000001`, seller `09120000002` (shop `yadakpart`), customer `09120000003`.

## Conventions
- **Wire format is camelCase.** Pydantic's `to_camel` turns `trend30d` into `trend30D` and `clicks_7d` into `clicks7D`. Give such fields an explicit `Field(alias=...)`. There's a test for `trend30d`.
- Domain rule violations raise `DomainError`, which becomes **422** `{detail}`. The frontend reads `detail`.
- Search URL params: `q`, `cat` (group or category), `brand`, `any=1` (ignore garage car), `all=1` (show incompatible). Category links keep `q` and drop `brand`.
- Seller signup requires `shopWebsite` (normalized to `https://…`). Demo shops use the reserved `.example` domain.
- Layering: routes stay thin and call module services. Modules never import from `api/`. Storage sits behind repositories or ports.
- New listings must still match exactly: `tests/test_ingestion.py::test_matcher_recovers_ground_truth_exactly` expects `product_count == len(TRUTH)`. A product listed for two different platforms splits into two products, so keep each `Truth.fits` to a single platform.
- New brands go in `taxonomy.BRANDS`. New product lines go in `normalize._LINES`. `normalize_text` maps `آ` to `ا`, so regexes must use `ا`.
- UI: Persian copy, RTL, `toPersianDigits` / `formatToman` for numbers, Tailwind tokens (`brand`, `navy`, `canvas`, `line`, `muted`) and the `card`, `btn-primary`, `chip`, `input` utilities in `globals.css` (Tailwind v4 `@utility`).
- A trademarked shop or brand **logo** must never be drawn into the art. Brand names in data are fine.

## Gotchas
- `init_db` only *adds* nullable columns. Renamed, removed or non-null columns still need a DB reset (or Alembic in production).
- uvicorn `--reload` sometimes misses changes on Windows. Restart the server if the catalog looks stale.
- The catalog is in memory and rebuilt on startup or `POST /admin/reindex`. Seller price edits are re-applied from `offer_overrides`.
- There's no Claude key in dev, so the assistant runs `offline` (watch for `mode` in the response). Photo search needs a key.
