---
name: part-torob
description: Recipes for changing the قطعه ترب (PartTorob) monorepo — FastAPI backend + Next.js frontend. Use for adding an endpoint, a page, a product/shop/brand to the simulated market, a vehicle model, a test, or resetting demo data, so you don't need to re-scan the codebase. Read AGENT.md first for the file map.
---

# PartTorob recipes

Start from the map in `AGENT.md`. Open only the files a recipe names.

## Add a backend endpoint
1. Put the logic in a service function in `backend/app/modules/<area>.py`. Raise `DomainError` for rule violations; it becomes a 422.
2. Add a thin route in `backend/app/api/routes/<area>.py`, with response models built on `app.core.schema.Schema`.
   - Auth deps: `UserId` (login required), `OptionalUserId` (guests allowed), `AdminUser`, `SellerUser`.
   - A new router must be added to the tuple at the bottom of `app/main.py`.
3. Check aliases: any field with a digit after a letter (e.g. `trend30d`) needs `Field(alias="...")`.
4. Write a test in `backend/tests/` using the `client`, `user`, `seller` and `admin` fixtures from `conftest.py`. Run `.venv/Scripts/python -m pytest -q`.

## Use it in the frontend
1. Add the wire type to `frontend/src/lib/types.ts` (camelCase) and a getter to `api` in `frontend/src/lib/api.ts`. Server Components call `api.*`.
2. Client-side mutations go through `postJson("/api/<path>", body, method)` from `components/actions.tsx`. The proxy adds the session automatically.
3. If guests may use the page or endpoint, add it to `PUBLIC_PAGES` or `PUBLIC_API` in `src/middleware.ts`.
4. Verify with `npx tsc --noEmit -p . && npx eslint src`.

## Add a product to the simulated market
- Append a `Truth(...)` to `TRUTH` in `backend/app/modules/ingestion/sources/market.py`. Use **one platform per product** in `fits`, and pick a unique combination of category, brand, line, position, specs and platform.
- New brand: add it to `BRANDS` in `modules/catalog/taxonomy.py`, with every surface form (Persian and Latin).
- New product line: add it to `_LINES` in `modules/ingestion/normalize.py`.
- Run `pytest tests/test_ingestion.py`. The matcher test must still recover `len(TRUTH)` products exactly.

## Add a shop
Append a `SellerStyle(...)` to `SELLERS` in `market.py`. Set `groups=("oils",)` etc. for a specialist shop. `coverage` controls how much of the catalogue the shop lists, `price_bias` how expensive it is.

## Add a vehicle model
Add a `_v(...)` call in `backend/app/modules/vehicles.py` with a body type (`hatchback|sedan|suv|truck|sport`), aliases, specs and a `_rules(...)` maintenance schedule. Product fitment by spec works automatically. Explicit-fit parts need `Truth.fits` entries that use the new aliases.

## Reset or reseed demo data
Stop the API (preview server `qatee-api`), delete `backend/data/qatee.db`, then start it again. The seed is deterministic (`random.Random(1405)`). Demo phones: admin `09120000001`, seller `09120000002`, customer `09120000003`.
