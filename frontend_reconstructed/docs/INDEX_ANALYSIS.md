# index.html analysis

EXACT surviving document:

```html
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>مشيخة التعليم الزيتوني وفروعه - منصة تعليم زيتوني</title>
    <link rel="icon" type="image/png" href="/assets/platform-logo-mark.png">
    <meta
      name="description"
      content="منصة تعليمية تونسية تجمع بين أصالة التعليم الزيتوني وتجربة رقمية حديثة لتعلم القرآن والفقه والعقيدة."
    >
    <script type="module" crossorigin src="/assets/index-Bgp60kJC.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-D7j9Kx6Z.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>

```

| Feature | Evidence | Confidence |
| --- | --- | --- |
| Mount | div#root | EXACT |
| Language / direction | ar / rtl | EXACT |
| Charset | UTF-8 | EXACT |
| JS entry | /assets/index-Bgp60kJC.js, module + crossorigin | EXACT |
| CSS entry | /assets/index-D7j9Kx6Z.css, crossorigin | EXACT |
| Favicon | /assets/platform-logo-mark.png | EXACT |
| Preloads | No preload/modulepreload tags in HTML; runtime polyfill in entry | EXACT |
| Web fonts | No external font requests or @font-face; system fallback stack | EXACT |
| External scripts / styles | None in HTML | EXACT |
| Analytics / structured data | None in HTML | EXACT |
| SEO | Arabic title, description, viewport | EXACT |
| OpenGraph / Twitter / canonical | No tags present | EXACT |

Reconstruction preserves the document metadata verbatim, replacing only the compiled script/style tags with the source entry; CSS imports through main.jsx.
