# Master prompt — replicate this billing system for any business

A reusable brief for building a zero-backend invoicing app like this one for a
different business, industry or document type.

**How to use it:** fill in [§1 Business profile](#1-business-profile) — that block is the
only part you must edit — then paste this whole file to a coding agent. Everything
below §1 is deliberately business-agnostic.

Sections 5 and 6 are the ones worth keeping verbatim. They encode failures that cost
real debugging time on the original build; an agent working from a blank brief will
reproduce every one of them.

---

## 0. Role and brief

> You are building a **single-page, zero-backend document generator** that runs by
> opening `index.html` — no build step, no server, no accounts, no dependencies to
> install. It must work from `file://`, including PDF export.
>
> Build the whole thing. Do not stub, do not leave TODOs, and do not ask which
> features to include — the spec below is the scope. Verify it in a real browser
> before reporting done.

---

## 1. Business profile

*Edit this block. It is the only part that changes between businesses.*

```yaml
business:
  name:            "<Business name>"
  tagline:         "<One-line descriptor>"
  industry:        "<e.g. film & media / dental clinic / law firm / freelance design>"
  address:         "<Street\nCity, Postcode\nCountry>"
  email:           "<billing@example.com>"
  phone:           "<+00 000 0000000>"
  website:         "<example.com>"
  logo:            "<path to a square PNG, or 'none' to generate a wordmark>"

document:
  type:            "invoice"        # invoice | quote | estimate | receipt | statement
  numberPrefix:    "INV-"
  currency:        "<PKR | USD | EUR | GBP | AED …>"
  locale:          "<en-GB | en-US | …>"   # drives date and number formatting
  paymentTermDays: 30

features:
  tax:             false           # true adds a configurable tax/VAT/GST line
  itemDiscounts:   true            # per-line discount
  multiCurrency:   false

design:
  mood:            "<e.g. refined studio / clinical & calm / corporate authority>"
  # Leave blank to let the agent choose from `industry` + `mood`.
  palette:         ""
  displayFont:     ""
  uiFont:          ""
```

**Choosing design when left blank.** Derive from `industry` + `mood`, then commit to
one direction rather than blending several:

| Industry feel | Palette direction | Type pairing |
| --- | --- | --- |
| Creative / studio / editorial | Warm neutrals, cream ground, single brass or ink accent | Editorial serif display + neutral UI sans |
| Medical / legal / financial | Cool neutrals, near-white ground, one deep blue or green accent | Restrained sans throughout, heavier weights for hierarchy |
| Trades / industrial | Warm grey, high contrast, safety-adjacent accent used sparingly | Condensed grotesque display + workhorse sans |
| Luxury / hospitality | Near-black ground, off-white type, muted metallic accent | High-contrast serif + wide-tracked sans smallcaps |

One accent colour only. It marks the document number, discounts and the active
state — nothing else.

**Set the document in the UI sans, not the display serif.** jsPDF only ships
Helvetica, Times and Courier, so a document set in a serif display face looks like a
different artefact in the PDF than in the preview. Keep the display face for the app
chrome, where it costs nothing, and set the document itself in the sans. Hierarchy
comes from size, weight and tracking, not from a second family.

**Structure with hairlines and tracked small caps, not filled bars.** A solid black
table header and a black totals slab are what make a document read as a 2010 word
processor template. A 0.9px rule under tracked 6.6pt uppercase labels reads as
designed. Give the amount due its own tinted strip near the top with a coloured
edge — it is the one number the reader is looking for.

---

## 2. Hard architecture constraints

These are not preferences. Violating any one of them breaks a stated requirement.

1. **No build step.** Vanilla HTML, CSS and JS. Classic `<script>` tags, not ES
   modules — `type="module"` is blocked by CORS under `file://`.
2. **Namespace modules.** Each file exposes one object via an IIFE
   (`const Store = (() => { … })();`). Load order is the dependency order.
3. **One document renderer.** The on-screen preview, the print output and the PDF
   describe the same layout. The HTML renderer is the single source of truth for
   preview and print; the PDF module redraws that same layout in vector primitives.
   **Never** maintain two copies of the document markup.
4. **Vector PDF only.** jsPDF + AutoTable. Do not screenshot the DOM with
   html2canvas — see §5.1.
5. **All state is local.** `localStorage`, namespaced keys, defensive reads. No
   network calls beyond the CDN scripts and web fonts.
6. **Escape everything.** All user input passes through an escape helper before
   reaching `innerHTML`.

---

## 3. Feature specification

### Editor
- Split workspace: form left, live document preview right. The preview is an actual
  A4 page that updates as the user types.
- Below ~1180px, collapse to one column with an Edit/Preview toggle.
- Line items with description, quantity, rate and per-item discount; live per-row
  and invoice-level totals.
- `Enter` in the last description field adds the next line item.
- Inline validation — errors appear next to the offending field, focus moves to the
  first one. Never use `alert()`; use toasts.
- Status: draft / sent / paid. A paid document is stamped and shows "Total paid".

### Persistence
- **Draft autosave** (debounced ~500ms), restored silently on return with a toast.
- **Saved documents**: searchable list; open, duplicate, re-export, delete.
  Duplicating produces a fresh unsaved document with a new number and today's dates.
- **Client memory**: clients are remembered on save and autocomplete by name or
  company, filling every field.
- **Auto-numbering**: prefix + zero-padded counter. Peek without consuming; only
  advance the counter when a document that used the peeked number is first saved.
- **Business settings panel**: name, tagline, contact details, logo upload,
  numbering, payment terms, default payment instructions and terms. Nothing about
  the business is hardcoded in the source.
- **Backup**: export all data as JSON; import **merges** by id rather than
  overwriting, so importing on a populated machine never destroys work.

### Output
- Vector PDF: selectable text, repeating table header across pages, per-page footer
  with page numbers, and a continuation caption on pages after the first.
- Print stylesheet: `Cmd/Ctrl+P` prints the document alone, no app chrome.
- Filename: `<Type>_<Number>_<Client>.pdf`, with the client name slugified.

### Interface
- Light and dark themes for the app chrome, persisted, defaulting to
  `prefers-color-scheme`. **The document itself is always print-light** — it is a
  document, not a UI surface.
- Keyboard: `⌘/Ctrl+S` save, `⌘/Ctrl+↵` export, `⌘/Ctrl+P` print, `Alt+A` add item,
  `Alt+N` new, `Alt+H` history, `Esc` close panel.
  Use `Alt` for app-specific bindings — `⌘⇧N` and friends are taken by browsers.
- `beforeunload` warning **only** when there are unsaved changes on a never-saved
  document. Warning on every navigation trains people to ignore it.

---

## 4. File layout

```
index.html        Markup and layout
styles.css        Tokens, app UI, document, print, responsive
js/
  logo.js         Default mark inlined as a data URL      (no deps)
  util.js         Formatting, escaping, dates, money maths (no deps)
  store.js        localStorage persistence                 (util)
  document.js     Document renderer — preview and print    (util, logo)
  pdf.js          Vector PDF export                        (util, logo)
  app.js          State, validation, toasts, shortcuts      (all)
  panels.js       Settings and history, backup             (all)
```

Money maths lives in `util.js` **once** — `itemMath()` and `invoiceMath()` — and is
called by the editor, the document and the PDF. Three implementations of the same
arithmetic will disagree eventually.

---

## 5. Traps — read before writing code

Each of these was a real defect. They are not hypothetical.

### 5.1 Screenshot PDFs cannot paginate
Rendering the preview with html2canvas and dropping it into a PDF scales the whole
canvas to fit one page, so a long document shrinks to unreadable rather than
flowing to page 2. The output is also unsearchable and 1–3MB. **Use vector jsPDF
from the start.** Retrofitting it later means rewriting the document layout twice.

### 5.2 jsPDF embeds images uncompressed by default
A 256×256 RGBA logo becomes ~262KB of raw bitmap — a one-page invoice ships at
280KB. Fix both ends:

```js
const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
doc.addImage(logo, "PNG", x, y, w, h, undefined, "MEDIUM");
```

Result on the reference build: **280KB → 25KB.**

### 5.3 `file://` images taint the canvas, which breaks PDF export
Reading `logo.png` through a canvas to get a data URL throws a `SecurityError`
under `file://`, so the logo silently vanishes from the PDF. **Inline the default
logo as a base64 data URL** in its own JS file. Downscale to ~256px first:

```bash
sips -Z 256 logo.png --out /tmp/logo256.png
printf 'const DEFAULT_LOGO_DATA_URL = "data:image/png;base64,' > js/logo.js
base64 -i /tmp/logo256.png | tr -d '\n' >> js/logo.js
printf '";\n' >> js/logo.js
```

Uploaded logos come from `FileReader.readAsDataURL`, which is never tainted. Cap
uploads at ~900KB — the image is embedded in every PDF and counts against the
`localStorage` quota.

### 5.4 jsPDF's built-in fonts are WinAnsi
En dashes, em dashes, curly quotes and bullets all encode fine. **U+2212 MINUS and
U+00A0 NBSP do not** and come out as garbage. Fold only those two, so the PDF keeps
the typography the preview shows:

```js
str.replace(/−/g, "-").replace(/[  ]/g, " ");
```

Note that **AutoTable draws cell strings verbatim**, bypassing any fold you apply
elsewhere — keep table cell content ASCII-safe at the point you build the rows.

### 5.5 `new Date("2026-07-29")` is UTC midnight
Anywhere west of GMT it renders as the previous day. Parse date inputs manually:

```js
const [y, m, d] = iso.split("-");
return new Date(+y, +m - 1, +d);   // local midnight
```

### 5.6 Print CSS loses to responsive rules
`@media (max-width: 1180px) { body[data-view="edit"] .stage { display: none } }`
also matches at print widths, and it out-specifies a bare `.stage { display: block }`
in your print block. Use `display: block !important` on the elements print must show.

### 5.7 Responsive tables lose their labels
When a grid row stacks on mobile, a hidden column header leaves bare number inputs
with no indication of which is quantity and which is rate. Wrap each control in a
label whose text is hidden on wide screens:

```css
.item__f       { display: contents; }   /* input stays a direct grid child */
.item__f > span{ display: none; }
@media (max-width: 760px) {
  .item__f       { display: flex; flex-direction: column; }
  .item__f > span{ display: block; }
}
```

### 5.8 AutoTable's default themes are too heavy
Use `theme: "plain"` with `lineWidth: 0`, then draw hairlines yourself in
`didDrawCell` for body rows only. A full grid looks like a spreadsheet, not a
document.

### 5.9 `charSpace` breaks right alignment
jsPDF's width measurement ignores letter-spacing, so `{ align: "right", charSpace }`
drifts by `charSpace × (length − 1)`. Only apply tracking to left-aligned text.

### 5.10 Scaling the A4 preview
Render the page at true `210mm` and scale it with a CSS transform, setting the
factor from JS. The wrapper needs an explicit height because transforms do not
affect layout:

```js
const scale = Math.min(1, fit.clientWidth / paper.offsetWidth);
fit.style.setProperty("--paper-scale", scale);
fit.style.height = paper.offsetHeight * scale + "px";
```

Recompute on resize **and** on `document.fonts.ready` — web fonts change the page
height after first paint.

### 5.11 Fixed-width numeric columns wrap large amounts
AutoTable columns are fixed width, and a currency where ordinary line items run to
seven figures will silently wrap `1,250,000.00` onto two lines inside the cell. Size
the numeric columns for the widest realistic amount, not for the sample data:

```js
// 28mm at 8.6pt with 2mm side padding holds "99,999,999.00" on one line
const money = { halign: "right", cellWidth: 28,
                cellPadding: { top: 2.9, bottom: 2.9, left: 2, right: 2 } };
```

Mirror it in the HTML with `white-space: nowrap` on numeric cells and `normal` on
the description cell. **Test with a seven-figure amount** — small sample values hide
this completely.

### 5.12 Audit the supplied logo before shipping it
Client logo files are routinely unusable as-is, and it reads as "the app renders my
logo badly" rather than "my file is padded". Measure it first:

```python
from PIL import Image
im = Image.open("logo.png").convert("RGBA")
a = im.split()[3]
bbox = a.point(lambda v: 255 if v > 24 else 0).getbbox()   # artwork extent
print(bbox, "of", im.size)                                  # padding?
opaque = [p for p in im.getdata() if p[3] > 24]
print(sum(p[0] for p in opaque)/len(opaque))                # too light to print?
```

The reference asset was a 1024×1024 file whose artwork filled only 44% of the
canvas, drawn as a pale silver gradient. In a 15mm box the visible mark came out
**6.6mm and washed out**. Fix by deriving a print mark: trim to the alpha bbox, pad
to a square (a forced-square `addImage` distorts a non-square source), and flatten a
monochrome gradient to solid ink using alpha as the shape mask. Keep the original
file untouched.

**Then re-check dark mode.** A mark flattened to ink so it prints well becomes
invisible on a dark app bar. Do not invert — an uploaded colour logo depends on its
own colours. Put the mark on a light chip:

```css
[data-theme="dark"] .brand__mark { background: #f2efe9; padding: 3px; }
```

### 5.13 Everything else
- Re-render the item list only on add/remove, never on keystroke, or the field
  loses focus mid-typing.
- Wrap every `localStorage` read in try/catch. A corrupt key must not white-screen
  the app.
- `localStorage.setItem` throws `QuotaExceededError` — surface it as a real message,
  not a silent failure.
- Restore **every** field from a draft. Partial restore is worse than none, because
  the user believes their work is safe.

---

## 6. Verification — required before reporting done

Drive the finished app in a real headless browser (Playwright/Puppeteer against a
local static server). Do not report success on inspection alone.

```
[ ] Boots with zero console errors or warnings
[ ] Totals: subtotal, discount and grand total match hand-computed values
[ ] Preview contains client name, every line item and the correct total
[ ] Typing `<img src=x onerror="window.__pwned=1">` into a text field does NOT
    execute and does NOT appear as an element in the preview DOM
[ ] Export downloads a file starting with the bytes %PDF
[ ] Exported PDF is under ~60KB for a one-page document
[ ] pdftotext on the export returns the line item descriptions (proves real text)
[ ] A 25+ item document produces a multi-page PDF with a repeated table header
    and correct "Page X of Y"
[ ] Save populates the history list; open and duplicate both restore correctly
[ ] Settings changes propagate to the document and survive reload
[ ] Draft restores every field after a reload
[ ] Client autocomplete matches on a partial name and fills all fields
[ ] Submitting with an empty required field flags that field inline
[ ] Dark mode engages and the document stays light
[ ] At 390px viewport: document.scrollWidth <= 390 (no horizontal overflow)
[ ] At 390px: every line-item input has a visible label
[ ] A seven-figure line item renders on one line in the PDF, not wrapped
[ ] The paid state renders its stamp and switches "amount due" to "total paid"
[ ] The logo is legible in the document AND against the dark-mode app bar
    (sample the pixels — do not eyeball it)
```

Render the PDF to PNG (`pdftoppm -png -r 110`) and **look at it**. Byte counts and
selector assertions will not catch a logo that failed to draw or a totals box
overlapping the footer.

---

## 7. Definition of done

- Opens from `file://` and works fully, including PDF export.
- No dead code, no commented-out buttons, no leftover scratch files.
- Every checklist item in §6 passes, verified in a browser.
- README documents the layout, the local-storage model, and the traps in §5 that
  remain load-bearing in the code.
- Comments explain *why* a non-obvious thing is done, not what the line does.

---

## 8. Adapting to other document types

Set `document.type` and adjust these four things; the rest carries over unchanged:

| Type | Title | Totals label | Notable change |
| --- | --- | --- | --- |
| Invoice | INVOICE | Amount due | — |
| Quote / Estimate | QUOTE | Estimated total | "Valid until" replaces "Due"; add an acceptance line |
| Receipt | RECEIPT | Total paid | Payment date and method replace due date; always stamped paid |
| Statement | STATEMENT | Balance outstanding | Items become dated transactions with a running balance |

**Adding tax** (`features.tax: true`) touches four places together — miss one and the
figures disagree: `Util.invoiceMath()`, the totals block in the editor, the sums
section in the document renderer, and the totals block in the PDF.
