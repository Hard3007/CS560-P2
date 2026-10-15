# RecallGuard: Tian Yuan feature design

Authors: Tian Yuan (Recall Browser and Watchlist), Sheng Qin (My Products). Northeastern CS560 Project 2; existing repository identifies the course as CS5610 Web Development.

## Objective and persona

Sarah is a safety-conscious consumer who checks government notices and needs to remember which recalls require action. RecallGuard combines shared read-only government records with a browser-scoped action list. Norman's existing My Products feature remains intact.

## User stories

- Sarah searches product names and brands and narrows results by category and risk.
- Sarah saves a notice and revisits it after refreshing her browser.
- Sarah changes its status, records follow-up notes and removes notices she no longer needs.

## Interface mockups

```text
Recall Explorer
[Country: All / US / CA] [Risk] [Product or keyword] [Search]
More filters: [Category] [Brand/manufacturer] [From date] [To date]
Recall name | Country | Category | Risk | Updated
[Open notice] [Save to Watchlist]
[Previous] Page 1 [Next]

My Watchlist
Saved recall title -> detail page
Status [Reviewing / Contacted Manufacturer / Resolved]
Notes [                                              ]
[Save changes] [Remove]
Changes saved.
```

## Structure and decisions

HTML pages render data with Vanilla ES Modules and textContent. API calls share the existing browser identity module. Express routes validate input; database modules use only the MongoDB Native Driver. Products, watchlist and users are mutable collections; recalls is read-only. Watchlist stores the source pair and a title snapshot, avoiding client-supplied recall content. A unique owner/source pair enforces duplicate protection, and updates/deletes include the owner and expiration in their predicates. Existing retention middleware renews all personal data for 365 days.

There is no account login or cross-device sync. The dataset does not update automatically; users follow the original notice for authoritative instructions. Brand fields in the imported dataset are empty, so the brand filter includes manufacturers and existing search/contact text. No Mongoose, CommonJS, template engine or frontend framework is introduced.
