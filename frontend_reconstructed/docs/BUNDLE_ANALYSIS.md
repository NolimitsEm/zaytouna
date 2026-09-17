# Bundle analysis

All eight JavaScript files and the stylesheet were parsed/formatted for analysis. Original hashes and links are in the inventory. No bundle was loaded as the reconstructed application.

| Bundle | Bytes | Top-level declarations/statements | String occurrences | Lazy imports | Reachability |
| --- | --- | --- | --- | --- | --- |
| index-Bgp60kJC.js | 198291 | 31 | 2145 | ./legacyApp-Cum0wzIn.js | ACTIVE |
| index-BpsoARiZ.js | 198291 | 31 | 2145 | ./legacyApp-zwsQ_H0a.js | INACTIVE from current HTML |
| index-CgL810mR.js | 198291 | 31 | 2145 | ./legacyApp-yxETG9Cp.js | INACTIVE from current HTML |
| index-n9OLsKfI.js | 198291 | 31 | 2145 | ./legacyApp-DC3euCG1.js | INACTIVE from current HTML |
| legacyApp-Cum0wzIn.js | 757431 | 1456 | 13687 | none | ACTIVE |
| legacyApp-DC3euCG1.js | 755748 | 1456 | 13666 | none | INACTIVE from current HTML |
| legacyApp-yxETG9Cp.js | 717707 | 1424 | 12753 | none | INACTIVE from current HTML |
| legacyApp-zwsQ_H0a.js | 751016 | 1452 | 13573 | none | INACTIVE from current HTML |

## Boundaries

Active entry embeds React, scheduler and ReactDOM before the final ch app shell. Its lone lazy import is legacyApp-Cum0wzIn.js. The active legacy chunk starts with audience/identifier utilities (offsets 0–3436), then SheetJS vendor code (3436–368558), then default data, shared state, event registration, pages and domain functions. Only two vendor symbols cross into the app: xn (workbook read) and $S.sheet_to_json. They are replaced with xlsx imports.

All 680 app functions and 75 state bindings are accounted for by symbol-map.json/state-map.json. The alternate bundles are all inspected, including their strings, I/O and declarations; no assumption that the largest/latest filename is production was needed. Literal asset and API cross-reference reports include every version.
