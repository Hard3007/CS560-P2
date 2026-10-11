# RecallGuard

Track products you own and check for safety recalls.

**Authors:** Sheng Qin and Tian Yuan  
**Course:** [CS5610 Web Development, Fall 2026](https://johnguerra.co/classes/webDevelopment_online_fall_2026/)  
**Repository:** [infiniwire/CS560-P2](https://github.com/infiniwire/CS560-P2)

**Website:** [RecallGuard](https://cs560-p2-production.up.railway.app/)

## About

RecallGuard brings together recall records from the U.S. Consumer Product Safety Commission (CPSC) and Health Canada. Users will be able to keep a list of their products, look for possible recalls, and save notices to a watchlist.

The project uses HTML, CSS, Vanilla JavaScript, Express, and MongoDB with the native Node.js driver. Recall Explorer lists the imported notices with country, keyword, category, and risk filters. Each row opens the full recall details. The product and watchlist features are still under development.

The initial data import contains 15,262 notices: 10,047 from CPSC and 5,215 from Health Canada. They are stored in `recallguard.recalls` using the same 22-field structure. See [recall data](data/README.md) for the fields and source details.

## Run locally

Requires Node.js 22.13 or newer and npm.

```sh
npm ci
```

Copy `.env.example` to `.env`. Set `MONGODB_PUBLIC_URI` to the `MONGO_PUBLIC_URL` from the Railway MongoDB service, then start the server:

```sh
npm run dev
```

Open <http://localhost:4173>. Use `npm start` to run without file watching.

Local development loads `.env` and uses `MONGODB_PUBLIC_URI`, falling back to `MONGODB_URI`. Without either setting, the page can run without a database connection. The local connection points to the same Railway database used in production.

To check formatting and lint rules:

```sh
npm run check
npm run format
```

## Browser identity

The app does not require a login. On the first visit, the browser generates a random UUID and saves it in `localStorage` as `recallguard.userId`. API requests made through the frontend API module include it in the `X-User-Id` header. The same browser keeps this ID across page navigation and reloads.

Products and watchlist records will use this ID when those features are implemented. The current recall endpoints still return shared public data. This ID is not authentication. Clearing site data, using a different browser, or changing the site origin creates a separate identity; localhost and the deployed site do not share one. Product and watchlist content will be stored in MongoDB.

Each page records a visit through `POST /api/user`. API requests carrying a valid `X-User-Id` update the user's `lastSeenAt` and renew the expiration of their products and watchlist for another 365 days. Health checks do not count as user activity.

MongoDB TTL indexes on `users`, `products`, and `watchlist` remove records after `expiresAt`. Cleanup runs in MongoDB even when the web server is stopped, with a short background-processing delay. Returning after expiration also removes expired personal records before renewing the ID. Shared `recalls` never expire under this policy. Future product and watchlist writes must store `userId` and `expiresAt` from `req.user`; clients cannot set their own expiration date.

## Recall API

`GET /api/recalls` reads the imported records from MongoDB. It returns `items`, `total`, `page`, `limit`, and `totalPages`, sorted by the source update date, newest first.

The default page size is 20; the maximum is 100. For example, open <http://localhost:4173/api/recalls?page=1&limit=20> to read the first page. Invalid pagination returns HTTP 400, and a database error returns HTTP 503.

Frontend modules can import `fetchRecalls` from `/js/api.js` and call `fetchRecalls({ page: 1, limit: 20 })` to load a page of records.

The list also accepts `country` (`US` or `CA`), `q` (keyword), `category`, `risk`, and `sort` (`latest` or `oldest`). Category matching accepts partial text. Risk filters and short labels match keywords in the official title, falling back to the hazard text when the title has no recognized risk.

`updatedFrom` and `updatedTo` filter the source update date using `YYYY-MM-DD`. Both dates are included, and either end can be left blank. Category and the updated range are available under More filters in the Explorer.

`GET /api/recalls/filters` returns the category and risk options. `GET /api/recalls/:source/:sourceId` returns a complete notice, or HTTP 404 if it does not exist. The Explorer table uses summary records; descriptions, instructions, contact information, and images appear on the detail page.

## Deployment

Railway deploys the `main` branch using the Dockerfile. The server listens on Railway's `PORT`, and `/health` is the deployment health check.

The production environment uses these variables:

```text
NODE_ENV=production
MONGODB_URI=${{MongoDB.MONGO_URL}}
MONGODB_DB=recallguard
```

Production uses `MONGODB_URI` over Railway's private network and requires a working database connection at startup. `/health` and `/api/health` check the connection and return HTTP 503 if it fails.

Keep database credentials in `.env` locally and Railway variables in production. `.env` is excluded from Git.

## Team responsibilities

- Sheng Qin: My Products, product CRUD, search and filtering, and recall matching.
- Tian Yuan: Recall Explorer and My Watchlist, recall search, saved recalls, notes, and status updates.
- Shared: recall data, database connection, and page styles.

## License

[MIT](LICENSE). The third-party font and university mark have separate terms.
