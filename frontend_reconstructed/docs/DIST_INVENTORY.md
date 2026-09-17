# Complete dist inventory

EXACT: every regular file was read as bytes, including hidden entries. Original evidence is never written. SHA-256 baseline: `forensics/dist-sha256.json`. Purpose classifications are HIGH CONFIDENCE; no reference is not proof of non-use.

Files: 18. Total bytes: 8381419. Directories: assets/, templates/. brand/ and brand-concepts/ are absent (EXACT).

| Original path | Filename | Extension | Bytes | MIME | Purpose | index.html | JS/CSS references | Confidence |
|---|---|---|---:|---|---|---|---|---|
| C:\Users\hp\Music\zaytouna\dist\assets\bulletin-header-left.png | bulletin-header-left.png | .png | 24529 | image/jpeg | Institution / report-card logo | no | assets/index-Bgp60kJC.js, assets/index-BpsoARiZ.js, assets/index-CgL810mR.js, assets/index-n9OLsKfI.js, assets/legacyApp-Cum0wzIn.js, assets/legacyApp-DC3euCG1.js, assets/legacyApp-yxETG9Cp.js, assets/legacyApp-zwsQ_H0a.js | EXACT (metadata and literal references); HIGH CONFIDENCE (purpose) |
| C:\Users\hp\Music\zaytouna\dist\assets\bulletin-header-right.png | bulletin-header-right.png | .png | 248261 | image/png | Institution / report-card logo | no | assets/index-Bgp60kJC.js, assets/index-BpsoARiZ.js, assets/index-CgL810mR.js, assets/index-n9OLsKfI.js, assets/legacyApp-Cum0wzIn.js, assets/legacyApp-DC3euCG1.js, assets/legacyApp-yxETG9Cp.js, assets/legacyApp-zwsQ_H0a.js | EXACT (metadata and literal references); HIGH CONFIDENCE (purpose) |
| C:\Users\hp\Music\zaytouna\dist\assets\bulletin-signature.png | bulletin-signature.png | .png | 53736 | image/jpeg | Report-card signature | no | assets/legacyApp-Cum0wzIn.js, assets/legacyApp-DC3euCG1.js, assets/legacyApp-yxETG9Cp.js, assets/legacyApp-zwsQ_H0a.js | EXACT (metadata and literal references); HIGH CONFIDENCE (purpose) |
| C:\Users\hp\Music\zaytouna\dist\assets\index-Bgp60kJC.js | index-Bgp60kJC.js | .js | 198291 | text/javascript | React entry + lazy application import | yes | none found | EXACT (metadata and literal references); HIGH CONFIDENCE (purpose) |
| C:\Users\hp\Music\zaytouna\dist\assets\index-BpsoARiZ.js | index-BpsoARiZ.js | .js | 198291 | text/javascript | React entry + lazy application import | no | none found | EXACT (metadata and literal references); HIGH CONFIDENCE (purpose) |
| C:\Users\hp\Music\zaytouna\dist\assets\index-CgL810mR.js | index-CgL810mR.js | .js | 198291 | text/javascript | React entry + lazy application import | no | none found | EXACT (metadata and literal references); HIGH CONFIDENCE (purpose) |
| C:\Users\hp\Music\zaytouna\dist\assets\index-D7j9Kx6Z.css | index-D7j9Kx6Z.css | .css | 117292 | text/css | Production stylesheet | yes | none found | EXACT (metadata and literal references); HIGH CONFIDENCE (purpose) |
| C:\Users\hp\Music\zaytouna\dist\assets\index-n9OLsKfI.js | index-n9OLsKfI.js | .js | 198291 | text/javascript | React entry + lazy application import | no | none found | EXACT (metadata and literal references); HIGH CONFIDENCE (purpose) |
| C:\Users\hp\Music\zaytouna\dist\assets\islamic-pattern.png | islamic-pattern.png | .png | 1985070 | image/png | Decorative pattern | no | assets/index-D7j9Kx6Z.css | EXACT (metadata and literal references); HIGH CONFIDENCE (purpose) |
| C:\Users\hp\Music\zaytouna\dist\assets\legacyApp-Cum0wzIn.js | legacyApp-Cum0wzIn.js | .js | 757431 | text/javascript | Application logic + bundled spreadsheet vendor | no | assets/index-Bgp60kJC.js | EXACT (metadata and literal references); HIGH CONFIDENCE (purpose) |
| C:\Users\hp\Music\zaytouna\dist\assets\legacyApp-DC3euCG1.js | legacyApp-DC3euCG1.js | .js | 755748 | text/javascript | Application logic + bundled spreadsheet vendor | no | assets/index-n9OLsKfI.js | EXACT (metadata and literal references); HIGH CONFIDENCE (purpose) |
| C:\Users\hp\Music\zaytouna\dist\assets\legacyApp-yxETG9Cp.js | legacyApp-yxETG9Cp.js | .js | 717707 | text/javascript | Application logic + bundled spreadsheet vendor | no | assets/index-CgL810mR.js | EXACT (metadata and literal references); HIGH CONFIDENCE (purpose) |
| C:\Users\hp\Music\zaytouna\dist\assets\legacyApp-zwsQ_H0a.js | legacyApp-zwsQ_H0a.js | .js | 751016 | text/javascript | Application logic + bundled spreadsheet vendor | no | assets/index-BpsoARiZ.js | EXACT (metadata and literal references); HIGH CONFIDENCE (purpose) |
| C:\Users\hp\Music\zaytouna\dist\assets\main-logo.png | main-logo.png | .png | 1067146 | image/png | Platform branding | no | assets/index-Bgp60kJC.js, assets/index-BpsoARiZ.js, assets/index-CgL810mR.js, assets/index-n9OLsKfI.js, assets/legacyApp-Cum0wzIn.js, assets/legacyApp-DC3euCG1.js, assets/legacyApp-yxETG9Cp.js, assets/legacyApp-zwsQ_H0a.js | EXACT (metadata and literal references); HIGH CONFIDENCE (purpose) |
| C:\Users\hp\Music\zaytouna\dist\assets\platform-logo-full.png | platform-logo-full.png | .png | 1067146 | image/png | Platform branding | no | none found | EXACT (metadata and literal references); HIGH CONFIDENCE (purpose) |
| C:\Users\hp\Music\zaytouna\dist\assets\platform-logo-mark.png | platform-logo-mark.png | .png | 24529 | image/jpeg | Platform branding | yes | assets/index-D7j9Kx6Z.css | EXACT (metadata and literal references); HIGH CONFIDENCE (purpose) |
| C:\Users\hp\Music\zaytouna\dist\index.html | index.html | .html | 799 | text/html | Document / React mounting shell | no | none found | EXACT (metadata and literal references); HIGH CONFIDENCE (purpose) |
| C:\Users\hp\Music\zaytouna\dist\templates\exemple-import-comptes.xlsx | exemple-import-comptes.xlsx | .xlsx | 17845 | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | Account-import workbook template | no | assets/legacyApp-Cum0wzIn.js, assets/legacyApp-DC3euCG1.js | EXACT (metadata and literal references); HIGH CONFIDENCE (purpose) |

## Duplicate bytes

- EXACT: assets/bulletin-header-left.png = assets/platform-logo-mark.png
- EXACT: assets/main-logo.png = assets/platform-logo-full.png

## Active bundle graph

EXACT: index.html → assets/index-Bgp60kJC.js → dynamic import assets/legacyApp-Cum0wzIn.js. Main CSS: assets/index-D7j9Kx6Z.css. Other three entry/legacy pairs are not reachable from current index.html and are analyzed separately as surviving alternate artifacts. They are not route-specific chunks. Framework vendor code is embedded in each entry; spreadsheet vendor is embedded in each legacy chunk.
