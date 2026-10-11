# RecallGuard

Track Products and Check Safety Recalls.

**Authors:** Sheng Qin and Tian Yuan  
**Course:** [CS5610 Web Development, Fall 2026](https://johnguerra.co/classes/webDevelopment_online_fall_2026/)  
**Repository:** [infiniwire/CS560-P2](https://github.com/infiniwire/CS560-P2)

**Live application:** [RecallGuard](https://cs560-p2-production.up.railway.app/)

## Current state

A minimal starting point with a RecallGuard logo above the My Products, Recall Explorer, and My Watchlist links. There is no body content or frontend JavaScript. Express serves the pages and a server-only MongoDB module supports production connection checks. Product CRUD, recall matching, watchlist features, and data import are not implemented.

No government records have been imported. The server does not create, modify, or delete database records.

## Local preview

Requires Node.js 22.13 or newer and npm.

```sh
npm ci
npm run dev
```

Open <http://localhost:4173>. `npm start` runs without file watching. Copy `.env.example` to `.env` and set `MONGODB_PUBLIC_URI` to the resolved `MONGO_PUBLIC_URL` from the Railway MongoDB service. Local development automatically loads `.env` and prefers this public connection; it can fall back to `MONGODB_URI`. If both are blank, local preview runs without MongoDB. Port 4173 is used because port 3000 is reserved on the development machine.

Railway deployments (identified by `RAILWAY_ENVIRONMENT_ID`) and any process with `NODE_ENV=production` use only `MONGODB_URI`, regardless of `MONGODB_PUBLIC_URI`. Keep the public URL in the ignored local `.env`, never in source files. Both local and production connections use the `recallguard` database. Opening <http://localhost:4173/health> verifies the actual database ping; a successful connection returns `database: "connected"`.

```sh
npm run check
npm run format
```

## Railway deployment

The Dockerfile installs production dependencies and starts Express on `0.0.0.0` using Railway's `PORT`. The `production` environment must set `MONGODB_URI` to a reference to its MongoDB service's private connection URL, and `MONGODB_DB` to `recallguard`. Keep connection credentials in Railway variables, never in frontend code or Git.

The RecallGuard Railway project contains the `CS560-P2` application and a MongoDB service with persistent storage in `production`. The application automatically deploys from GitHub `main`. The service uses the detected Dockerfile, public target port 8080, and `/health` as its deployment health check. These service settings are configured in Railway.

Runtime variables:

```text
NODE_ENV=production
MONGODB_URI=${{MongoDB.MONGO_URL}}
MONGODB_DB=recallguard
```

The URI above is a Railway reference expression, not a credential. MongoDB is reached over Railway private networking.

Production startup requires a successful MongoDB connection and ping. `/health` and `/api/health` repeat a bounded database ping and return HTTP 503 if it fails. Local preview without a URI returns `database: "not_configured"`; it does not claim database connectivity. Health responses include the Railway Git revision when available.

## Future feature ownership

- Sheng Qin: My Products, product CRUD, search/filtering, and recall matching.
- Tian Yuan: Recall Explorer and My Watchlist, recall search, saved recalls, notes, and status CRUD.
- Shared: government recall reference data, MongoDB connection, and base styles.

## License

[MIT](LICENSE), excluding third-party font assets.
