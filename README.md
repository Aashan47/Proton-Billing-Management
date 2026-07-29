# Proton Billing

A billing tool for a film and media studio. Write an invoice, watch it typeset itself
on an A4 page beside you, and export a real vector PDF. No build step, no backend,
no account — open `index.html` and start.

![Proton Billing](Img.png)

## Running it

```
open index.html
```

That is the whole setup. Every feature works from `file://`, including PDF export.

The only network requests are two CDN scripts (jsPDF and its AutoTable plugin) and
the web fonts. If you are offline, the app still runs and falls back to system fonts;
only PDF export needs those two scripts, and it tells you plainly if they did not load.

To serve it instead — useful on a phone on the same network:

```
python3 -m http.server 8000
```

## What it does

**Live A4 preview.** The document renders next to the form and updates as you type.
What you see is what prints and what exports — there is one renderer, not three.

**Vector PDF export.** Text stays selectable and searchable, prints sharp at any zoom,
and a typical invoice weighs about 25KB. Long invoices flow across as many pages as
they need, repeating the table header and numbering every page.

**Invoice history.** Save an invoice and it lands in a searchable list. Open it,
duplicate it into a fresh one, re-export its PDF, or delete it.

**Client memory.** Clients are remembered as you invoice them. Start typing a name
and the rest of their details fill themselves in.

**Business settings.** Name, tagline, address, contact details and logo are all
editable and stored on your device — nothing is hardcoded in the source. Invoice
numbers auto-increment from a prefix and counter you control.

**Backup.** Export everything to a JSON file and import it on another machine.
Imports merge rather than overwrite, so nothing already saved is lost.

**Drafts.** Work in progress is saved continuously and restored when you come back.

**Print.** `Cmd/Ctrl+P` prints the invoice on its own, with no app chrome.

**Dark mode.** For the app. The document stays print-light, because it is a document.

## Keyboard

| Shortcut | Action |
| --- | --- |
| `⌘/Ctrl + S` | Save invoice |
| `⌘/Ctrl + ↵` | Download PDF |
| `⌘/Ctrl + P` | Print |
| `Alt + A` | Add line item |
| `Alt + N` | New invoice |
| `Alt + H` | Invoices & clients |
| `↵` in a description | Next line item, adding one if needed |
| `Esc` | Close the open panel |

## Layout

```
index.html        Markup and layout
styles.css        Design system, app UI, document, print and responsive rules
js/
  logo.js         Default studio mark, inlined as a data URL
  util.js         Formatting, escaping, dates, money maths
  store.js        localStorage: business profile, invoices, clients, draft
  document.js     The invoice document renderer — preview and print
  pdf.js          Vector PDF export (jsPDF + AutoTable)
  app.js          Editor state, validation, toasts, shortcuts, autosave
  panels.js       Settings and history slide-overs, backup import/export
```

`document.js` and `pdf.js` describe the same layout in two media. Change one and
change the other.

## Notes for whoever edits this next

**Everything is local.** All data lives in this browser's `localStorage` under the
`proton.*` keys. Clearing site data deletes it — export a backup first. Nothing is
ever sent anywhere.

**The logo is inlined on purpose.** Reading `Img.png` through a canvas taints it
under `file://`, which breaks PDF export. `js/logo.js` holds the mark as a data URL
so export works everywhere. Uploaded logos are stored the same way; keep them under
900KB, since the image is embedded in every PDF and counts against the storage quota.

**PDF text is WinAnsi.** jsPDF's built-in fonts cover en dashes, em dashes, curly
quotes and bullets, but not `−` (U+2212). `Pdf.ascii()` folds what would otherwise
come out as garbage.

**User input is escaped.** Anything typed into the form passes through
`Util.escapeHtml` before it reaches `innerHTML`.

**Currency is PKR**, defined once as `Util.CURRENCY`. There is no tax field — add
both together if you need them, since a tax line changes the totals maths in
`Util.invoiceMath`, the document, and the PDF.

## Browsers

Chrome, Edge, Safari and Firefox, current versions. Layout relies on CSS grid,
`color-mix()` and container-free scaling; PDF export relies on jsPDF 2.5.

---

Built for Proton Studio.
