# RecallGuard

Track products you own and check for safety recalls.

**Authors:** Sheng Qin and Tian Yuan  
**Course:** [CS5610 Web Development, Fall 2026](https://johnguerra.co/classes/webDevelopment_online_fall_2026/)  
**Repository:** [GitHub](https://github.com/infiniwire/CS560-P2)  
**Live Website:** [RecallGuard](https://cs560-p2-production.up.railway.app/)  
**Demo Video:** [Watch on YouTube](https://youtu.be/re9B-7c_GTQ)  
**Presentation:** [Google Slides](https://docs.google.com/presentation/d/1ufp5M8hFYiZehxvBPbusM1RnFuYfpa3vkGh370FGLbY/edit?usp=sharing)

## Project Overview

RecallGuard is a web application that helps users track their products, search government safety recall records, and manage a personal recall watchlist.

The application integrates public recall data from the U.S. Consumer Product Safety Commission (CPSC) and Health Canada, containing over 15,000 recall records.

## Features

### My Products

- Add, edit, and delete personal products.
- Search and filter products by brand and category.
- Find potential recall matches for owned products.
- Browse 20 products per page and 10 possible recall matches per page.

### Recall Explorer

- Browse and search government recall records.
- Filter by country, keyword, category, risk, and date.
- View detailed recall information.
- Open product images in a larger viewer with zoom and drag controls.

### My Watchlist

- Save important recalls to a personal watchlist.
- Update recall status: Reviewing, Contacted Manufacturer, or Resolved.
- Add and edit personal notes.
- Remove recalls from the watchlist.
- Browse saved recalls in pages of 20, newest saved first.

## How to Use

1. Open My Products and add a product using the name on its packaging. Brand, model, category, and country are optional. Use Check recalls to find possible matches, then open the official notice to confirm whether your product is affected.
2. Open Recall Explorer to search public notices. Choose a country or risk, or use More filters for category, brand/manufacturer, and updated dates. Select a notice to read its details or save it to your watchlist.
3. Open My Watchlist to update a saved recall's status and notes. Select Save changes to keep your edits, or Remove when you no longer need the entry.

No login is required. The browser stores a random user ID in localStorage; products and saved recalls are stored in MongoDB under that ID. Clearing browser storage loses access to the previous list. Personal records expire after 365 days without a request from that browser identity. MongoDB removes expired records through TTL indexes, and the application excludes expired records from reads.

This browser ID is a simple way to separate demo users, not a secure authentication system. The imported recall dataset is a fixed snapshot and does not update automatically.

## Tech Stack

| Layer        | Technologies                          |
| ------------ | ------------------------------------- |
| Frontend     | HTML5, CSS3, Vanilla JavaScript (ES6) |
| Backend      | Node.js, Express.js                   |
| Database     | MongoDB (Native Driver)               |
| Deployment   | Railway                               |
| Data Sources | CPSC, Health Canada                   |

## Screenshots

### Home Page

![Home Page](screenshots/home.png)

### My Products

![My Products](screenshots/products.png)

### Recall Explorer

![Recall Explorer](screenshots/recalls.png)

### My Watchlist

![My Watchlist](screenshots/watchlist.png)

## Installation

**Requirements:** Node.js 22.13+ and npm.

1. Clone the repository:

```bash
git clone https://github.com/infiniwire/CS560-P2.git
cd CS560-P2
```

2. Install dependencies:

```bash
npm ci
```

3. Configure environment variables:

Copy `.env.example` to `.env` and configure the MongoDB connection.

4. Start the application:

```bash
npm run dev
```

5. Open:

http://localhost:4173

To check code quality:

```bash
npm run check
```

Use `npm run format` to apply Prettier formatting.

## Database

RecallGuard uses MongoDB with the native Node.js driver.

Main collections:

- `recalls`: Government recall records (15,262 records).
- `products`: User-owned products.
- `watchlist`: Saved recalls, statuses, and notes.
- `users`: Browser-based user identities.

The application supports CRUD operations on products and watchlist records.

## Documentation

- [Design Document](docs/DESIGN.md)
- [Recall Dataset Documentation](data/README.md)

## Team Responsibilities

**Sheng Qin — My Products & Recall Explorer**

- Product CRUD operations
- Product search and filtering
- Recall matching
- Frontend and backend implementation

**Tian Yuan — Recall Explorer & Watchlist**

- Recall browsing and advanced filtering
- Watchlist CRUD operations
- Status and notes management
- Frontend and backend implementation

Both members contributed to the shared application.

## Deployment

The application is deployed on Railway.

**Live Website:** https://cs560-p2-production.up.railway.app/

Database credentials are stored securely in environment variables and are not committed to GitHub.

## AI Assistance

We used OpenAI Codex to help prepare recall data from CPSC and Health Canada, including mapping different source fields into a consistent structure for MongoDB.

Codex helped review application logic and debug pagination issues, such as page counts, navigation between pages, and returning to a valid page after deleting an entry.

We also used Codex to improve the interface for mobile devices by adjusting spacing, tables, filters, and buttons, and fixing horizontal overflow.

For Railway deployment, Codex helped troubleshoot environment variables, MongoDB connections, and differences between local and production configuration.

Codex helped identify and fix ESLint and Prettier issues to keep code quality and formatting consistent across the project.

Sheng used Codex to implement the image viewer, including click-to-enlarge, mouse-wheel zoom, drag controls, and reset functionality.

We also used AI to help answer specific technical questions, including the performance trade-offs between prefetching pages and loading them on demand, and estimates of how many concurrent users our server specifications could support.

## License

This project is licensed under the [MIT License](LICENSE).
