# RecallGuard

Track Products and Check Safety Recalls.

**Authors:** Sheng Qin and Tian Yuan  
**Course:** [CS5610 Web Development, Fall 2026](https://johnguerra.co/classes/webDevelopment_online_fall_2026/)  
**Repository:** [infiniwire/CS560-P2](https://github.com/infiniwire/CS560-P2)

## Current state

A minimal starting point with a RecallGuard logo above the My Products, Recall Explorer, and My Watchlist links. There is no body content or frontend JavaScript. Express serves the pages and a server-only MongoDB module supports production connection checks. Product CRUD, recall matching, watchlist features, and data import are not implemented.

No government records have been imported. The server does not create, modify, or delete database records.

## Local preview

Requires Node.js 22.13 or newer and npm.

```sh
npm ci
npm run dev
```

Open <http://localhost:4173>. `npm start` runs without file watching. MongoDB is optional for local preview. Copy `.env.example` to `.env` to configure a local connection. Port 4173 is used because port 3000 is reserved on the development machine.

```sh
npm run check
npm run format
```

## Railway deployment

The Dockerfile installs production dependencies and starts Express on `0.0.0.0` using Railway's `PORT`. The `production` environment must set `MONGODB_URI` to a reference to its MongoDB service's private connection URL, and `MONGODB_DB` to `recallguard`. Keep connection credentials in Railway variables, never in frontend code or Git.

Production startup requires a successful MongoDB connection and ping. `/health` and `/api/health` repeat a bounded database ping and return HTTP 503 if it fails. Local preview without a URI returns `database: "not_configured"`; it does not claim database connectivity. Health responses include the Railway Git revision when available.

## Future feature ownership

- Sheng Qin: My Products, product CRUD, search/filtering, and recall matching.
- Tian Yuan: Recall Explorer and My Watchlist, recall search, saved recalls, notes, and status CRUD.
- Shared: government recall reference data, MongoDB connection, and base styles.

## License

[MIT](LICENSE), excluding third-party font assets.
