# Verification

## Automated

`npm ci`, `npm test`, `npm run check` (Node >=22.13). HTTP tests inject a fake repository and do not use production data. They cover valid CRUD, idempotent saves, owner separation, invalid input, missing notices, malformed JSON and service errors. Query tests verify literal keyword/brand handling and combined filters.

## MongoDB and browser acceptance (requires a development database)

1. Start with a development URI and imported recalls matching data/README.md. Open My Products and verify add/edit/delete, filters and recall matches still work.
2. In Recall Explorer combine keyword, brand, category, risk, country and date filters. Clear filters; change sort and navigate pages. Open a notice.
3. Save the same notice from the list and detail page; verify only one watchlist document exists for this browser/source pair.
4. Open My Watchlist. Edit each status and notes, save, refresh and confirm persistence. Cancel Remove, then confirm Remove and refresh.
5. Use another browser identity: the original user's entries should not appear; updates and deletes with their IDs should return 404.
6. Simulate database unavailability: show readable errors and retry. Verify empty results, keyboard form controls and narrow-screen layout.
7. Before public deployment rotate exposed credentials and configure the unique index. If preexisting duplicate watchlist records exist, deduplicate in development and review production migration first. Verify the Railway health endpoint and repeat this workflow on the deployed origin.

Deployment and live MongoDB persistence cannot be confirmed by repository-only tests. The supplied archive does not include imported recall records or credentials.

## Results for this delivery

- Node 24.19.0: `npm test` passed both tests (HTTP workflow with multiple assertions and recall query construction).
- `npm run check`: ESLint and Prettier passed.
- Local server: health endpoint and Products, Recalls, Watchlist HTML/module requests returned 200. Health reports database not configured.
- Five My Products files (HTML, JS, CSS, route and DB module) match the original archive byte for byte.
- Headless browser test could not start: bundled Chromium is absent and installed Chrome aborted in this environment. No browser/UI success is claimed.
- MongoDB indexes, real persistence, concurrent database saves and public deployment were not exercised; no database URI or imported data was supplied.
