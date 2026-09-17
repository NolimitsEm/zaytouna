# Production asset usage

EXACT: filenames and decoded image signatures/dimensions are in [ASSET_MAP.md](ASSET_MAP.md). Three files named `.png` actually contain JPEG bytes: `bulletin-header-left.png`, `bulletin-signature.png`, `platform-logo-mark.png`. Their original bytes and paths are preserved; no format conversion or renaming was performed.

| Asset | Active page/component use | Classification |
| --- | --- | --- |
| bulletin-header-left.png | Persistent React header; education logo in bulletin/report templates | EXACT references; HIGH CONFIDENCE UI role |
| bulletin-header-right.png | Persistent React header; Zitouna logo in bulletin/report templates | EXACT references; HIGH CONFIDENCE UI role |
| bulletin-signature.png | Bulletin signature defaults and enrollment-certificate signature | EXACT references; HIGH CONFIDENCE UI role |
| islamic-pattern.png | Authored CSS page backgrounds, hero/panels and decorative pseudo-elements | EXACT CSS references |
| main-logo.png | Loading screen, home/platform pages, footer, login/activation/account views, default admin avatar | EXACT references |
| platform-logo-mark.png | HTML favicon and CSS decorative brand pseudo-element | EXACT references |
| platform-logo-full.png | Byte-identical copy of main-logo.png; no literal reference found | EXACT duplicate; UNREFERENCED, possible dynamic use UNKNOWN |
| exemple-import-comptes.xlsx | Administrative users → create panel, downloadable account import template | EXACT reference and tested byte-identical download |

The current HTML uses `index-Bgp60kJC.js`, `index-D7j9Kx6Z.css` and the lazy `legacyApp-Cum0wzIn.js`. Three other entry/lazy pairs are unreachable from that HTML and remain analysis-only. They are not extra pages to insert into the reconstruction.

`brand/` and `brand-concepts/` do not exist in the supplied evidence. No conceptual asset classification can be performed on absent files. Missing print references `email-signature-logo-1.png` and `email-signature-logo-2.png` are documented separately and were not substituted.
