# Style analysis

EXACT: the entire 117292-byte stylesheet was read. src/styles/production.css is its readable formatting, preserving rule/declaration order and values; no redesign, reset, utility framework or additional CSS was added. forensics/beautified_bundles contains the independent analysis copy.

## Tokens

| Variable | Value |
| --- | --- |
| --color-primary | #68752A |
| --color-primary-dark | #3F4A1D |
| --color-secondary | #1689A8 |
| --color-secondary-dark | #08657A |
| --color-accent | #704522 |
| --color-gold | #F2D14B |
| --color-antique-gold | #C9A348 |
| --color-burgundy | #7C2424 |
| --color-ink | #151515 |
| --color-ivory | #FAF8F1 |
| --color-cream | #F4EEDC |
| --color-border | #E9DFC5 |
| --color-muted | #6B6B65 |
| --color-white | #FFFFFF |
| --olive | var(--color-primary) |
| --olive-dark | var(--color-primary-dark) |
| --soft-green | rgba(104, 117, 42, .12) |
| --gold | var(--color-antique-gold) |
| --cream | var(--color-cream) |
| --paper | var(--color-white) |
| --ink | var(--color-ink) |
| --muted | var(--color-muted) |
| --line | var(--color-border) |
| --turquoise | var(--color-secondary) |
| --shadow | 0 24px 70px rgba(21, 21, 21, .12) |
| --shadow-soft | 0 14px 38px rgba(63, 74, 29, .08) |
| --radius | 18px |
| --radius-lg | 24px |
| --radius-sm | 12px |
| --container | min(1180px, calc(100% - 32px) ) |

## Typography

- EXACT: `Noto Kufi Arabic,IBM Plex Sans Arabic,Noto Sans Arabic,Cairo,Tajawal,Segoe UI,Tahoma,Arial,sans-serif`
- EXACT: `Aref Ruqaa,Noto Kufi Arabic,serif`
- EXACT: `Georgia,serif`
- EXACT: `Reem Kufi,Noto Kufi Arabic,Cairo,sans-serif`
- EXACT: `Aref Ruqaa,Reem Kufi,Noto Kufi Arabic,Cairo,sans-serif`
- EXACT: `Amiri,Traditional Arabic,serif`

No font binaries or @font-face rules survive. Actual rendering depends on installed fonts (UNKNOWN original machine font availability). Body: 16px, line-height 1.8, RTL/right-aligned.

## Breakpoints

- EXACT: `(max-width:760px)`
- EXACT: `(max-width:900px)`
- EXACT: `(max-width:620px)`
- EXACT: `(max-width:720px)`
- EXACT: `(max-width:680px)`
- EXACT: `(prefers-reduced-motion:no-preference)`
- EXACT: `(max-width:820px)`
- EXACT: `(max-width:960px)`

## Animation

- EXACT: `galleryFade`
- EXACT: `publicReveal`
- EXACT: `toastIn`
- EXACT: `toastOut`
- EXACT: `manuscriptDrift`

## Layout and components

EXACT: grid/flex layouts, sticky header, responsive navigation, panels/cards, nested template-based forms, table search and pagination, draggable account sidebar, toast region, gallery, exam/session forms and print documents. Styles contain successive overrides; keeping their order is essential. Common dimensions: --container min(1180px, calc(100% - 32px)); nav shell max 1280px; section/footer max 1120px. Border radii include `var(--radius)`, `50%`, `999px`, `var(--radius) var(--radius) 0 0`, `9px`, `var(--radius) 0 0 var(--radius)`, `var(--radius-sm)`, `calc(var(--radius) - 2px)`, `0`, `30px`, `999px 999px 20px 20px`, `20px`, `13px`, `22px`, `0 0 24px 24px`, `12px`, `24px 24px 0 0`, `42px 42px 34px 34px`, `0 0 18px 18px`, `26px`, `32px`, `999px 999px 26px 26px`, `0 0 16px 16px`, `24px`, `999px 999px 22px 22px`, `16px`, `10px`, `14px`, `18px`, `99px`, `999px 999px 0 0`, `999px 999px 24px 24px`, `50% 50% 12px 12px`, `999px 999px 18px 18px`, `28px`, `36px`, `999px 999px 28px 28px`, `999px 999px 32px 32px`, `8px`, `42% 58% 64% 36%`, `17px`, `15px`, `0 0 0 10px`, `19px`.

Spacing, shadows, color literals and every selector remain accessible in the readable CSS, not approximated into a new scale. Print-document styles also exist in generated HTML templates in bulletins.js and account/teaching modules.
