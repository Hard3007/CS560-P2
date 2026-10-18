# RecallGuard
## Design Document — Track Products and Check Safety Recalls

**Project:** CS5610 Project 2  
**Team:** Sheng Qin and Tian Yuan  
**Deployed application:** [RecallGuard](https://cs560-p2-production.up.railway.app/)  

> This document combines the team's original proposal with a read-only review of the deployed interface. The six user stories below reproduce the proposal wording. Interface observations describe visible pages and controls; they do not certify successful database writes or completion of every user story. Mockups are schematic reconstructions, not screenshots or original pre-implementation designs.

## 1. Project Description

### Problem and objective

People accumulate electronics and household products over time, while recall information is distributed across government notices. Finding a relevant notice is only part of the task: consumers also need to identify the product, understand the official instructions, and keep track of follow-up actions.

RecallGuard is a web application designed to bring these activities into one place. It combines a personal product tracker with a recall explorer and a saved-recall watchlist. The goal is to help users organize products they own, find possible recall matches, and track relevant notices without repeatedly searching for the same information.

A possible match is a starting point for checking a product, rather than proof that a particular unit is recalled. Users should compare identifying information and follow the linked official notice. The interface itself directs watchlist users to verify the product and follow official instructions.

### Core experience

| Area | Purpose | Evidence and scope |
| --- | --- | --- |
| Home | Introduce RecallGuard and offer three entry points. | Observed: My Products, Recall Explorer, and My Watchlist links. |
| My Products | Maintain an inventory, search/filter it, and check possible recalls. | Observed: empty inventory, Add product dialog, Search, Brand, Category, and Clear controls. Editing, deletion, and matching are proposal requirements; populated product behavior was not tested. |
| Recall Explorer | Browse and narrow government recall records. | Observed: populated results; country, keyword, risk, category, brand/manufacturer, and updated-date controls; sorting, pagination, recall links, and Save to Watchlist buttons. Filter outcomes were not exhaustively tested. |
| Recall Details | Read a notice and reach its official source. | Observed on one CPSC notice: source, title, dates, official link, hazard, action instructions, description, consumer contact, product facts, images, and Save to Watchlist. Available fields may vary by source or record. |
| My Watchlist | Revisit saved recalls and track follow-up. | Observed: empty state, Recall Explorer link, Refresh list, and browser-storage/expiry notice. Saving, status/notes updates, and removal are proposal requirements; populated-item controls and persistence were not tested. |

### Technology and data design

The HTML5, CSS3, Vanilla JavaScript with ES6 modules, and the Fetch API on the frontend; Node.js and Express on the backend; and MongoDB through the native Node.js driver. The deployed site is hosted at a Railway URL. Backend source code, driver use, collection schemas, and deployment configuration were not independently inspected for this document.

The proposed data model separates two writable feature collections from shared recall reference data:

| Data area | Intended role | Responsibility |
| --- | --- | --- |
| Products | User-managed owned-product records; supports product CRUD, searching/filtering, and possible recall matching. | Sheng Qin |
| Recall watchlist | Saved recall references with follow-up status and notes; supports watchlist CRUD. | Tian Yuan |
| Government recall records | Shared, read-only reference data imported into MongoDB from sources such as U.S. CPSC and Health Canada. | Shared reference dataset |

These are conceptual data areas from the proposal, not a verified database schema. Each member owns their feature across frontend, Express routes, and database operations. Product and watchlist CRUD are designed to remain independent; neither feature edits the government reference records.

The deployed explorer displays records labeled United States/U.S. CPSC and Canada/Health Canada. No automatic import schedule, real-time synchronization, complete source coverage, or freshness guarantee was verified.

### Access and boundaries

The watchlist page states: “Your list belongs to this browser.” It also states that clearing browser storage loses access and records expire after one year of inactivity. This is a user-facing access limitation; it does not establish where the records themselves are stored. Cross-device synchronization, accounts, email/push alerts, and automatic safety determinations are outside the functionality evidenced in this review.

## 2. User Personas

The names and core needs come from the proposal. The scenarios and design implications below elaborate those needs without adding demographic assumptions.

### Norman — Product Owner

**Context:** Norman owns many electronics and household products. He wants one place to keep track of them and quickly check for possible recalls.

**Goals**

- Keep his owned-product list current as he acquires, replaces, or discards products.
- Find a particular product through search, brand, or category.
- Compare possible recall results with the identifying information on his product.

**Pain points:** Product information is scattered across packaging and receipts, and searching government notices separately for every product takes effort. Similar names can make it difficult to distinguish a possible match from the exact affected model.

**Scenario:** Norman records a household appliance using its name, brand, model, and category. Later, he finds it in My Products and checks possible recall matches before comparing the official notice with the product label.

**Design implications:** Keep inventory maintenance separate from browsing all recalls. Use a focused product form, persistent search/filter controls, and clear language about possible matches. The observed form explains that brand and model help narrow recall searches.

### Sarah — Safety-Conscious Consumer

**Context:** Sarah regularly checks product recalls. She wants to save important notices and track whether she has taken action.

**Goals**

- Find relevant recalls by product name, brand, category, and risk.
- Keep useful notices available for later review.
- Record follow-up notes and progress, then remove notices she no longer needs to track.

**Pain points:** Repeating searches makes notices hard to revisit, and reading a notice does not capture whether she has contacted a manufacturer or completed a remedy.

**Scenario:** Sarah narrows Recall Explorer to relevant records, opens a notice, and reads the official instructions. She saves the notice, then uses her watchlist to track follow-up as described in the proposal.

**Design implications:** Present searchable recall metadata in a scannable table, give notices a dedicated details page, and make saving available near the record. Explain the watchlist's browser-specific access and inactivity expiry before users rely on it.

## 3. User Stories

### Sheng Qin — My Products

#### N1. Maintain owned products

> As Norman, I want to add, edit, and delete products I own so I can keep my product list up to date.

**Intended flow:** Open My Products → add a product → review the inventory → edit inaccurate information or delete an unneeded record.

**Design criteria:** The form captures product identity; successful changes should appear in the inventory. The observed Add product dialog contains Country (All, United States, Canada), Product name, Brand, Model, Category, Cancel, and Save product. Edit/delete controls and successful writes were not verified.

#### N2. Find products

> As Norman, I want to search and filter my products by brand and category so I can find a product easily.

**Intended flow:** Enter a search term and/or select brand/category → inspect the narrowed inventory → clear filters to return to the full list.

**Design criteria:** Keep Search, Brand, Category, and Clear visible together. Show the product count and a meaningful empty state. These controls and the empty inventory were observed; results for populated products were not tested.

#### N3. Check possible recall matches

> As Norman, I want to check my products against government recall records so I can see possible recall matches.

**Intended flow:** Locate an owned product → request possible recall matches → inspect relevant notices → verify identifying details against the official source.

**Design criteria:** Preserve the distinction between a possible match and a confirmed affected product. The exact matching algorithm, match interface, and match accuracy were not verified; this remains a proposal requirement in this document.

### Tian Yuan — Recall Watchlist

#### S1. Discover relevant recalls

> As Sarah, I want to browse and search government recall records by product name, brand, category, and risk so I can find recalls relevant to me.

**Intended flow:** Open Recall Explorer → use keyword/risk filters → expand More filters for category and brand/manufacturer → inspect results → open a recall.

**Design criteria:** Keep primary search controls visible and advanced controls behind More filters. The deployed interface additionally offers country and updated-date filters, newest/oldest sorting, and pagination. Risk labels include hazard types such as Fire or Crash; this document does not assume a numeric severity scale.

#### S2. Save recalls

> As Sarah, I want to save recalls to my watchlist so I can review them later.

**Intended flow:** Find a recall in Explorer or Details → choose Save to Watchlist → revisit it in My Watchlist using the same browser.

**Design criteria:** Offer saving at both discovery and detail stages, and explain where saved notices can be found. Both Save to Watchlist entry points were observed. No save request was submitted during this review.

#### S3. Track action and remove saved recalls

> As Sarah, I want to add notes and update the status of a saved recall, such as Reviewing, Contacted Manufacturer, or Resolved, and remove it when I no longer need to track it.

**Intended flow:** Open a saved notice → record notes and update status → revisit progress → remove the saved item when appropriate.

**Design criteria:** Associate follow-up information with the saved recall while leaving the source notice unchanged. The status examples come from the proposal; exact deployed options, editing controls, removal behavior, and persistence were not inspected because the reviewed watchlist was empty.

## 4. Design Mockups

### Reading these mockups

The wireframes below are drawn directly in Markdown using monospaced text blocks and reconstructed from the deployed pages. They use the site's restrained white/gray appearance, simple navigation, grouped forms, and text-led content hierarchy. Spacing, sample rows, and abbreviated content are schematic. They should not be presented as pixel-perfect screenshots or as evidence that an operation succeeded.

The main page wireframes reflect observed page structure. The watchlist's separate region describes proposal requirements whose populated layout was not observed. No unverified product-card or recall-match layout is invented.

### 4.1 Home

```text
┌──────────────────────────────────────────────────────────────────┐
│ ◇ RecallGuard                                                    │
│                                                                  │
│ Know what you bring home.                                        │
│ Track products, explore public notices, and follow recalls.       │
│                                                                  │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐   │
│ │ My Products      │ │ Recall Explorer  │ │ My Watchlist     │   │
│ │ Track possessions│ │ Browse notices   │ │ Follow recalls   │   │
│ │ Open →           │ │ Open →           │ │ Open →           │   │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

**Route:** `/`  
**Purpose:** Introduce the application with “Know what you bring home.” and direct users to My Products, Recall Explorer, or My Watchlist. The actual home page uses feature links rather than the inner pages' navigation bar.  
**Stories supported:** Entry point for N1–N3 and S1–S3.

### 4.2 My Products — empty inventory

```text
┌──────────────────────────────────────────────────────────────────┐
│ ◇ RecallGuard                                                    │
│ My Products     Recall Explorer     My Watchlist                  │
├──────────────────────────────────────────────────────────────────┤
│ Keep your products here and check for possible recalls.           │
│ [ Add product ]                                                  │
│                                                                  │
│ Search [________________________] [ Search ]                      │
│ Brand [ All brands ▾ ]  Category [ All categories ▾ ] [ Clear ]    │
│                                                                  │
│ 0 products                                  Newest added first   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Your product list is empty                                   │ │
│ │ Choose Add product to keep track of something you own.       │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Route:** `/products.html`  
**Hierarchy:** Shared navigation → introductory instruction and Add product → search/brand/category controls → product count and newest-added ordering → inventory/empty state.  
**Observed empty state:** “Your product list is empty,” followed by guidance to choose Add product.  
**Stories supported:** N1 and N2; N3 is a planned inventory workflow whose populated interface was not reviewed.

### 4.3 Add Product — dialog

```text
       ┌───────────────────────────────────────────────────┐
       │ Add product                                  [ × ] │
       │                                                   │
       │ Use the name on the product or packaging.          │
       │ Brand and model help narrow recall searches.      │
       │                                                   │
       │ Country  (●) All  ( ) United States  ( ) Canada     │
       │ Product name [_________________________________]  │
       │ Brand        [_________________________________]  │
       │ Model        [_________________________________]  │
       │ Category     [_______________________________ ▾]  │
       │                                                   │
       │                       [ Cancel ] [ Save product ] │
       └───────────────────────────────────────────────────┘
```

**Entry:** Add product on My Products.  
**Hierarchy:** Dialog title and close control → identification guidance → country → product name, brand, model, category → Cancel and Save product.  
**Design rationale:** Brand and model provide context for narrowing recall searches. The dialog was opened and closed without submitting a record. Required-field rules and validation behavior were not tested.  
**Story supported:** N1.

### 4.4 Recall Explorer — advanced filters expanded

```text
┌────────────────────────────────────────────────────────────────────────┐
│ ◇ RecallGuard                                                          │
│ My Products     Recall Explorer     My Watchlist                        │
├────────────────────────────────────────────────────────────────────────┤
│ Country  (●) All  ( ) United States  ( ) Canada                          │
│ Search [___________________]  Risk [ All risks ▾ ]  [ Search ]          │
│ [ More filters ▴ ]  [ Clear filters ]                                  │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Category [___________ ▾]  Brand or manufacturer [________________] │ │
│ │ Updated from [mm/dd/yyyy]  Updated to [mm/dd/yyyy]                  │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ Recall results                                         [ Newest ↕ ]   │
│ ────────────────────────────────────────────────────────────────────── │
│ Recall                 Country  Category          Risk   Updated       │
│ Van Rysel GRVL AF       US       Bicycles or        Crash  Oct 8, 2026   │
│ Bicycles →                      Accessories                            │
│ [ Save to Watchlist ]                                                  │
│ ────────────────────────────────────────────────────────────────────── │
│ 1–20 of results       [ ← Previous ]  Page …  [ Next → ]                 │
└────────────────────────────────────────────────────────────────────────┘
```

**Route:** `/recalls.html`  
**Hierarchy:** Shared navigation → country/search/risk → More filters and Clear filters → advanced category, brand/manufacturer, and updated-date range → results count and sort → recall table → pagination.  
**Result fields:** Recall, Country, Category, Risk, Updated, and Details. Recall titles open details, and rows expose Save to Watchlist. The sample bicycle row reflects an observed record; other content is abbreviated.  
**Stories supported:** S1 and S2.

### 4.5 Recall Details

```text
┌──────────────────────────────────────────────────────────────────┐
│ ◇ RecallGuard                                                    │
│ My Products     Recall Explorer     My Watchlist                  │
├──────────────────────────────────────────────────────────────────┤
│ ← Back to recalls                                                │
│ United States · U.S. CPSC                                        │
│ Recall title                                                     │
│ [ Save to Watchlist ]                                            │
│ Recall date · Last updated      Read the official notice ↗        │
│                                                                  │
│ ┌────────────────────────────────┐ ┌───────────────────────────┐ │
│ │ Hazard                         │ │ Product information       │ │
│ │ Source hazard text             │ │ Product · Category        │ │
│ │                                │ │ Manufacturer              │ │
│ │ What to do                     │ │ Recall number · Source ID │ │
│ │ Official action instructions   │ └───────────────────────────┘ │
│ │                                │                               │
│ │ Description                    │                               │
│ │ Consumer contact               │                               │
│ └────────────────────────────────┘                               │
│ Product images                                                   │
│ [ Image + caption ]  [ Image + caption ]  Click to enlarge         │
└──────────────────────────────────────────────────────────────────┘
```

**Route pattern observed:** `/recall.html?source=cpsc&id=11020&return=`  
**Hierarchy:** Back to recalls → source/country and notice title → Save to Watchlist, dates, and official-source link → Hazard, What to do, Description, Consumer contact → Product information → Product images.  
**Design rationale:** Place the hazard and response instructions near the top of the reading flow, with identifying facts and images available for comparison. Source records can omit fields: the reviewed example displayed “Not provided” for manufacturer.  
**Stories supported:** S1 and S2; official notice review also supports the intent of N3.

### 4.6 My Watchlist — empty state and proposal intent

```text
┌──────────────────────────────────────────────────────────────────┐
│ ◇ RecallGuard                                                    │
│ My Products     Recall Explorer     My Watchlist                  │
├──────────────────────────────────────────────────────────────────┤
│ My Watchlist                                                     │
│ Save recalls in Recall Explorer →, then track next steps here.    │
│ Open the notice to verify the product and official instructions.  │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Your list belongs to this browser. Clearing browser storage  │ │
│ │ loses access; records expire after one year of inactivity.   │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ Your watchlist is empty. Save a recall in Recall Explorer.        │
│ [ Refresh list ]                                                 │
└──────────────────────────────────────────────────────────────────┘

Proposal-only saved-item concept (populated layout not verified):
┌──────────────────────────────────────────────────────────────────┐
│ Saved recall → open notice                                       │
│ Status: Reviewing / Contacted Manufacturer / Resolved             │
│ Notes: follow-up information                                     │
│ Update notes/status · Remove saved recall                        │
└──────────────────────────────────────────────────────────────────┘
```

**Route:** `/watchlist.html`  
**Observed hierarchy:** Shared navigation → My Watchlist heading → instructions and Recall Explorer link → browser-access/expiry notice → empty-state message and Refresh list.  
**Proposal intent:** Saved recalls should support notes, status changes, and removal. The lower wireframe region records that intent without claiming to reproduce deployed populated controls.  
**Stories supported:** S2 and S3.

### Navigation and task flows

```text
Home
├── My Products
│   ├── Add product dialog                     [observed]
│   ├── Search / Brand / Category              [controls observed]
│   └── Edit / Delete / Possible recall check  [proposal; not tested]
├── Recall Explorer
│   ├── Search / filters / sort / pagination   [controls and records observed]
│   └── Recall Details                        [opened and inspected]
│       ├── Official notice link              [observed]
│       └── Save to Watchlist                 [control observed]
└── My Watchlist
    ├── Empty state / Refresh list             [observed]
    └── Notes / Status / Remove                [proposal; not tested]
```

### Interaction and usability principles

- **Keep tasks distinct:** My Products organizes possessions; Recall Explorer searches shared reference records; My Watchlist tracks follow-up on selected notices.
- **Support scanning:** Table columns expose country, category, hazard labels, and update dates before the user opens a full notice.
- **Reduce initial form complexity:** More filters reveals category, manufacturer, and date controls when needed.
- **Guide empty states:** Both reviewed personal-data pages explain the next step instead of showing an unexplained blank list.
- **Keep provenance visible:** Recall Details links back to the official notice and identifies the source.
- **Explain access limitations:** The watchlist explicitly describes browser access and expiry.

Responsive layouts, keyboard completeness, screen-reader behavior, error handling, and form validation were not audited. They are not asserted as verified properties of the deployment.

## 5. Sources and Verification Notes

1. **Original team proposal:** Supplied by the user in the referenced conversation, [解释项目提交要求](chatgpt-conversation://6ad4158f-2d74-83e8-af14-33bb42f0c3fb). Source for the project goal, personas, all six story texts, work division, technology choices, and conceptual data design.
2. **Deployed interface:** [Home](https://cs560-p2-production.up.railway.app/), [My Products](https://cs560-p2-production.up.railway.app/products.html), [Recall Explorer](https://cs560-p2-production.up.railway.app/recalls.html), and [My Watchlist](https://cs560-p2-production.up.railway.app/watchlist.html), reviewed October 17, 2026.
3. **Representative detail page:** [Van Rysel GRVL AF Bicycles](https://cs560-p2-production.up.railway.app/recall.html?source=cpsc&id=11020&return=), used to inspect notice structure and source-link placement.

The review opened pages, expanded advanced filters, and opened/closed the Add product dialog. It did not create, update, or delete products or watchlist entries. No claim is made about successful CRUD persistence, matching accuracy, authenticated ownership, database record count, or automatic data refresh. The explorer showed a populated result count, but that display alone is not a database audit.

## Document Format

All six mockups are embedded directly in this Markdown file as text wireframes. No image files, external fonts, or `mockups/` directory are required to render this document. View it in GitHub or a Markdown preview with a monospaced font; narrow screens may require horizontal scrolling within the diagrams.
