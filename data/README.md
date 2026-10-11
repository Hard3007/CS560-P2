# Recall data

RecallGuard uses public data from CPSC and Health Canada. The initial import was completed on October 11, 2026 (UTC), with 15,262 notices in `recallguard.recalls`.

| Source        | Downloaded | Imported |
| ------------- | ---------: | -------: |
| CPSC          |     10,047 |   10,047 |
| Health Canada |     34,210 |    5,215 |
| Total         |     44,257 |   15,262 |

For Canada, we included records whose `Organization` is `Consumer product safety`. Records from other organizations are kept in the original download. Archived notices are included.

## Fields

U.S. and Canadian records use the same 22 fields. Missing values are stored as `null`, and empty lists as `[]`.

| Fields                                                                 | Type                                                |
| ---------------------------------------------------------------------- | --------------------------------------------------- |
| `source`                                                               | `cpsc` or `health-canada`                           |
| `sourceId`                                                             | Source record ID, stored as a string                |
| `country`                                                              | `US` or `CA`                                        |
| `title`, `sourceUrl`, `sourceSnapshotId`, `searchText`                 | String                                              |
| `recallNumber`, `description`, `consumerContact`, `recallClass`        | String or `null`                                    |
| `products`                                                             | Array of `{ name: string, model: string or null }`  |
| `brands`, `manufacturers`, `upcs`, `categories`, `hazards`, `remedies` | Arrays of strings                                   |
| `images`                                                               | Array of `{ url: string, caption: string or null }` |
| `recallDate`, `sourceUpdatedDate`                                      | `YYYY-MM-DD` or `null`                              |
| `archived`                                                             | Boolean or `null`                                   |

Each document represents one notice from one source. U.S. and Canadian notices about the same product are kept separately. A unique index on `(source, sourceId)` prevents duplicates within each source. Each database document also includes `_id` and the import timestamps `firstImportedAt` and `lastImportedAt`.

`searchText` combines the title, product names and models, brands, manufacturers, UPCs, categories, and hazards in lowercase. The full description is stored separately. UPCs are strings so leading zeroes are preserved.

## Source differences

CPSC provides a recall date and a last-published date. These map to `recallDate` and `sourceUpdatedDate`. Canada's export only provides `Last updated`, so Canadian records have a `sourceUpdatedDate` and a null `recallDate`.

Neither export currently provides usable structured brand or model data. `brands` is empty and `products.model` is null. Manufacturer names are stored separately. Brand and model matching will need more information from the original recall pages.

Some older notices are also missing product names, hazards, or remedies. Category labels follow each source's own categories. The data includes safety alerts as well as recalls, so users should check the linked government notice to confirm whether their product is affected.

## Local files

The original downloads and prepared files are kept locally under `data/`. They are excluded from Git and Docker and are not served by the application.

| Location                                  | Contents                                                    |
| ----------------------------------------- | ----------------------------------------------------------- |
| `raw/<snapshot>/`                         | Original JSON downloads and source metadata                 |
| `prepared/<snapshot>/recalls.ndjson`      | Imported records, one document per line                     |
| `prepared/<snapshot>/manifest.json`       | Record counts, field list, source dates, and file checksums |
| `prepared/<snapshot>/quality-report.json` | Missing data counts and source URL corrections              |
| `prepared/<snapshot>/*receipt*.json`      | Import results and database checks                          |

The raw snapshot is `2026-10-11T05-28-22-640Z`. The prepared snapshot is `2026-10-11T05-48-03-284Z`, using schema version 2. The `latest.json` files point to these snapshots.

After import, all 15,262 database records were compared with the prepared file and matched. The download and import scripts have since been removed. This dataset does not update automatically.

## Sources

- [CPSC data](https://www.cpsc.gov/Data) and [recall JSON feed](https://www.saferproducts.gov/RestWebServices/Recall?format=json)
- [Government of Canada dataset](https://open.canada.ca/data/en/dataset/d38de914-c94c-429b-8ab1-8776c31643e3) and [JSON download](https://recalls-rappels.canada.ca/sites/default/files/opendata-donneesouvertes/HCRSAMOpenData.json)
