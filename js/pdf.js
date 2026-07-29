/* Vector PDF export (jsPDF + AutoTable).
   Real text, not a screenshot: selectable, searchable, sharp at any zoom,
   ~25KB per invoice, and it flows across as many pages as it needs.
   Mirrors the layout in document.js — change both together. */

const Pdf = (() => {
  const PAGE_W = 210;
  const PAGE_H = 297;
  const M = 15; // left/right margin
  const CONTENT_W = PAGE_W - M * 2;
  const TOP = 16;
  const CONT_TOP = 26; // top of content on continuation pages
  const FOOT_H = 20; // reserved strip at the bottom of every page

  const PT = 0.352778; // 1pt in mm

  const INK = [28, 25, 23];
  const INK_2 = [87, 83, 78];
  const MUTED = [111, 105, 97];
  const LABEL = [138, 131, 122];
  const ACCENT = [180, 83, 9];
  const RULE = [221, 214, 202];
  const HAIR = [236, 231, 223];
  const TINT = [248, 246, 242];
  const SUCCESS = [21, 128, 61];

  /* jsPDF's built-in fonts encode WinAnsi, which covers en/em dashes, curly
     quotes and bullets — but not U+2212 MINUS. Fold only what would otherwise
     come out as garbage, so the PDF keeps the typography the preview shows. */
  function ascii(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/−/g, "-")
      .replace(/[  ]/g, " ");
  }

  function imageFormat(dataUrl) {
    const match = /^data:image\/(png|jpe?g|webp)/i.exec(dataUrl || "");
    if (!match) return null;
    const kind = match[1].toLowerCase();
    if (kind === "png") return "PNG";
    if (kind === "webp") return "WEBP";
    return "JPEG";
  }

  /**
   * Build the invoice PDF.
   * @returns {jsPDF} the document, ready to save or open
   */
  function build(invoice, business) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error(
        "The PDF library did not load. Check your connection, then reload the page."
      );
    }

    const { jsPDF } = window.jspdf;
    // compress: deflate the content streams — without it a logo goes in as a
    // raw bitmap and a one-page invoice weighs ~280KB instead of ~25KB.
    const doc = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
      compress: true,
    });

    const items = Util.billableItems(invoice.items);
    const sums = Util.invoiceMath(items);
    const showDiscount = items.some((item) => Util.itemMath(item).discount > 0);
    const isPaid = invoice.status === "paid";

    /* --- Drawing helpers ------------------------------------------------- */

    function font(size, style, color) {
      doc.setFont("helvetica", style || "normal");
      doc.setFontSize(size);
      doc.setTextColor.apply(doc, color || INK);
    }

    function rule(y, x1, x2, color, weight) {
      doc.setDrawColor.apply(doc, color || RULE);
      doc.setLineWidth(weight || 0.15);
      doc.line(x1, y, x2, y);
    }

    /**
     * Letter-spaced text. jsPDF measures without charSpace, so right/centre
     * alignment has to be computed by hand — see README, PDF traps.
     */
    function tracked(str, x, y, size, color, em, align, style) {
      const text = ascii(str);
      const space = (em || 0) * size * PT;
      font(size, style || "bold", color);
      const width = doc.getTextWidth(text) + space * Math.max(0, text.length - 1);
      const startX = align === "right" ? x - width : align === "center" ? x - width / 2 : x;
      doc.text(text, startX, y, { charSpace: space });
      return width;
    }

    function label(str, x, y, align) {
      tracked(str.toUpperCase(), x, y, 6.6, LABEL, 0.18, align, "bold");
    }

    /* --- Brand band and masthead ----------------------------------------- */

    doc.setFillColor.apply(doc, ACCENT);
    doc.rect(0, 0, PAGE_W, 1.2, "F");

    const logo = business.logo || (typeof DEFAULT_LOGO_DATA_URL !== "undefined" ? DEFAULT_LOGO_DATA_URL : "");
    const format = imageFormat(logo);
    let nameX = M;

    if (format) {
      try {
        doc.addImage(logo, format, M, TOP, 15, 15, undefined, "MEDIUM");
        nameX = M + 19.5;
      } catch (error) {
        console.warn("Could not draw the logo, falling back to text only:", error);
      }
    }

    font(13, "bold", INK);
    doc.text(ascii(business.name || "Your Business"), nameX, TOP + 7.5);
    if (business.tagline) {
      font(8, "normal", MUTED);
      doc.text(ascii(business.tagline), nameX, TOP + 12);
    }

    tracked("INVOICE", PAGE_W - M, TOP + 7, 19, INK, 0.3, "right", "normal");
    font(9, "bold", ACCENT);
    doc.text(ascii(invoice.number || ""), PAGE_W - M, TOP + 13.5, { align: "right" });

    let y = TOP + 24;
    rule(y, M, PAGE_W - M, RULE, 0.2);

    /* --- Billed to / From / Dates ---------------------------------------- */

    y += 6;
    const gap = 8;
    const usable = CONTENT_W - gap * 2;
    const w1 = usable * (1.25 / 3.1);
    const w2 = usable * (1 / 3.1);
    const x1 = M;
    const x2 = x1 + w1 + gap;
    const x3 = x2 + w2 + gap;

    label("Billed to", x1, y);
    label("From", x2, y);
    label("Issued", x3, y);

    const client = invoice.client || {};
    let colY = y + 6;

    font(10.5, "bold", INK);
    doc.text(ascii(client.name || "-"), x1, colY);
    font(8, "normal", MUTED);
    let clientY = colY;
    [client.company, client.email, client.phone, client.address]
      .map((line) => String(line || "").trim())
      .filter(Boolean)
      .join("\n")
      .split("\n")
      .filter(Boolean)
      .forEach((line) => {
        doc.splitTextToSize(ascii(line), w1).forEach((wrapped) => {
          doc.text(wrapped, x1, (clientY += 4));
        });
      });

    font(8.8, "bold", INK);
    doc.text(ascii(business.name || ""), x2, colY);
    font(8, "normal", MUTED);
    let bizY = colY;
    [business.address, business.email, business.phone, business.website]
      .map((line) => String(line || "").trim())
      .filter(Boolean)
      .join("\n")
      .split("\n")
      .filter(Boolean)
      .forEach((line) => {
        doc.splitTextToSize(ascii(line), w2).forEach((wrapped) => {
          doc.text(wrapped, x2, (bizY += 4));
        });
      });

    font(9, "normal", INK);
    doc.text(ascii(Util.formatDate(invoice.issueDate)), x3, colY);
    label("Due", x3, colY + 6);
    font(9, "normal", INK);
    doc.text(ascii(Util.formatDate(invoice.dueDate)), x3, colY + 10.5);

    y = Math.max(clientY, bizY, colY + 10.5) + 9;

    /* --- Hero amount ------------------------------------------------------ */

    const heroH = 19;
    doc.setFillColor.apply(doc, TINT);
    doc.rect(M, y, CONTENT_W, heroH, "F");
    doc.setFillColor.apply(doc, isPaid ? SUCCESS : ACCENT);
    doc.rect(M, y, 1.1, heroH, "F");

    label(isPaid ? "Total paid" : "Amount due", M + 6, y + 6.5);

    font(10.5, "normal", MUTED);
    doc.text(Util.CURRENCY, M + 6, y + 14.5);
    const curW = doc.getTextWidth(Util.CURRENCY);
    font(19, "bold", INK);
    doc.text(Util.formatAmount(sums.total), M + 6 + curW + 1.8, y + 14.5);

    if (isPaid) {
      const stamp = "PAID IN FULL";
      const stampW = tracked(stamp, PAGE_W - M - 6 - 4, y + 11.6, 7.4, SUCCESS, 0.16, "right");
      doc.setDrawColor.apply(doc, SUCCESS);
      doc.setLineWidth(0.25);
      doc.roundedRect(PAGE_W - M - 6 - stampW - 7, y + 7.6, stampW + 7, 5.8, 2.9, 2.9, "S");
    } else {
      label("Payable by", PAGE_W - M - 6, y + 6.5, "right");
      font(9, "normal", INK);
      doc.text(ascii(Util.formatDate(invoice.dueDate)), PAGE_W - M - 6, y + 12.5, {
        align: "right",
      });
    }

    y += heroH + 10;

    /* --- Line items -------------------------------------------------------- */

    const head = ["Description", "Qty", "Rate"];
    if (showDiscount) head.push("Discount");
    head.push("Amount");

    const body = items.map((item) => {
      const m = Util.itemMath(item);
      const row = [ascii(item.description), String(m.quantity), Util.formatAmount(m.price)];
      // ASCII hyphen: AutoTable draws cells verbatim, without the ascii() fold.
      if (showDiscount) row.push(m.discount > 0 ? "-" + Util.formatAmount(m.discount) : "");
      row.push(Util.formatAmount(m.total));
      return row;
    });

    // Numeric columns must hold the widest realistic amount on one line.
    // At 8.6pt with 2mm side padding, 28mm fits "99,999,999.00"; anything
    // narrower wraps seven-figure line items across two lines.
    const numW = 28;
    const qtyW = 13;
    const money = { halign: "right", cellWidth: numW, cellPadding: { top: 2.9, bottom: 2.9, left: 2, right: 2 } };
    const cols = showDiscount ? 3 : 2;
    const columnStyles = {
      0: { halign: "left", cellWidth: CONTENT_W - numW * cols - qtyW, textColor: INK },
      1: { halign: "center", cellWidth: qtyW },
      2: Object.assign({}, money),
    };
    if (showDiscount) {
      columnStyles[3] = Object.assign({}, money, { textColor: ACCENT });
      columnStyles[4] = Object.assign({}, money, { fontStyle: "bold", textColor: INK });
    } else {
      columnStyles[3] = Object.assign({}, money, { fontStyle: "bold", textColor: INK });
    }

    let firstTablePage = true;

    doc.autoTable({
      head: [head.map((cell) => cell.toUpperCase())],
      body: body,
      startY: y,
      margin: { left: M, right: M, top: CONT_TOP, bottom: FOOT_H },
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 8.6,
        textColor: MUTED,
        cellPadding: { top: 2.9, bottom: 2.9, left: 3, right: 3 },
        lineWidth: 0,
        overflow: "linebreak",
        valign: "top",
      },
      // No filled header bar — a tracked small-caps row over a rule. AutoTable
      // has no letter-spacing, so the head is the one place the PDF is slightly
      // tighter than the preview.
      headStyles: {
        fillColor: false,
        textColor: LABEL,
        fontStyle: "bold",
        fontSize: 6.6,
        cellPadding: { top: 0, bottom: 2.4, left: 3, right: 3 },
      },
      columnStyles: columnStyles,
      didDrawCell: function (data) {
        const cell = data.cell;
        const isFirst = data.column.index === 0;
        const isLast = data.column.index === data.table.columns.length - 1;
        // Rules run edge to edge; cell padding must not indent them.
        const from = isFirst ? cell.x : cell.x;
        const to = isLast ? cell.x + cell.width : cell.x + cell.width;

        if (data.section === "head") {
          rule(cell.y + cell.height, from, to, INK, 0.3);
        } else if (data.section === "body") {
          rule(cell.y + cell.height, from, to, HAIR, 0.15);
        }
      },
      didDrawPage: function () {
        if (firstTablePage) {
          firstTablePage = false;
          return;
        }
        doc.setFillColor.apply(doc, ACCENT);
        doc.rect(0, 0, PAGE_W, 1.2, "F");
        font(7, "normal", LABEL);
        doc.text(ascii((invoice.number || "Invoice") + " · continued"), M, CONT_TOP - 7);
      },
    });

    /* --- Totals ------------------------------------------------------------ */

    let cursor = doc.lastAutoTable.finalY + 6;
    const boxW = 72;
    const boxX = PAGE_W - M - boxW;

    cursor = ensureSpace(doc, cursor, showDiscount ? 28 : 23);

    function sumRow(name, value, color) {
      font(8.6, "normal", MUTED);
      doc.text(ascii(name), boxX, cursor);
      font(8.6, "normal", color || INK);
      doc.text(value, PAGE_W - M, cursor, { align: "right" });
      cursor += 5;
    }

    sumRow("Subtotal", Util.formatAmount(sums.subtotal));
    if (showDiscount) sumRow("Discount", "-" + Util.formatAmount(sums.discount), ACCENT);

    cursor += 1.4;
    rule(cursor, boxX, PAGE_W - M, INK, 0.3);
    cursor += 5.6;
    label(isPaid ? "Total paid" : "Total due", boxX, cursor);
    font(13, "bold", INK);
    doc.text(
      Util.CURRENCY + " " + Util.formatAmount(sums.total),
      PAGE_W - M,
      cursor + 0.6,
      { align: "right" }
    );
    cursor += 13;

    /* --- Notes and terms ---------------------------------------------------- */

    const notes = noteBlock(doc, invoice.notes, "Payment instructions");
    const terms = noteBlock(doc, invoice.terms, "Terms & conditions");

    if (notes && terms) {
      const colW = (CONTENT_W - 9) / 2;
      const hNotes = measureNote(doc, notes, colW);
      const hTerms = measureNote(doc, terms, colW);
      cursor = ensureSpace(doc, cursor + 4, Math.min(Math.max(hNotes, hTerms), 60));
      const top = cursor;
      drawNote(doc, notes, M, top, colW, font, label, rule);
      drawNote(doc, terms, M + colW + 9, top, colW, font, label, rule);
      cursor = top + Math.max(hNotes, hTerms);
    } else if (notes || terms) {
      const only = notes || terms;
      cursor = ensureSpace(doc, cursor + 4, Math.min(measureNote(doc, only, CONTENT_W), 60));
      cursor = drawNote(doc, only, M, cursor, CONTENT_W, font, label, rule);
    }

    /* --- Footer on every page ------------------------------------------------ */

    const pages = doc.internal.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      const fy = PAGE_H - 13;

      rule(fy, M, PAGE_W - M, RULE, 0.15);
      font(7.2, "normal", LABEL);
      doc.text(ascii(business.name || ""), M, fy + 4.4);

      if (business.footerNote) {
        font(7.2, "normal", INK_2);
        doc.text(ascii(business.footerNote), PAGE_W / 2, fy + 4.4, { align: "center" });
      }

      font(7.2, "normal", LABEL);
      doc.text(
        pages > 1
          ? ascii(invoice.number || "") + "  ·  " + page + " / " + pages
          : ascii(invoice.number || ""),
        PAGE_W - M,
        fy + 4.4,
        { align: "right" }
      );
    }

    return doc;
  }

  /** Move to a new page if `needed` mm will not fit above the footer strip. */
  function ensureSpace(doc, y, needed) {
    if (y + needed <= PAGE_H - FOOT_H) return y;
    doc.addPage();
    return CONT_TOP;
  }

  /** Normalise a note into a title plus its lines, or null when empty. */
  function noteBlock(doc, text, title) {
    const lines = String(text || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return null;
    return { title: title, lines: lines, bulleted: lines.length > 1 };
  }

  function wrapNote(doc, note, width) {
    const indent = note.bulleted ? 3.6 : 0;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    const rows = [];
    note.lines.forEach((line) => {
      doc.splitTextToSize(line, width - indent).forEach((part, index) => {
        rows.push({ text: part, first: index === 0 });
      });
    });
    return { rows: rows, indent: indent };
  }

  function measureNote(doc, note, width) {
    const wrapped = wrapNote(doc, note, width);
    return 8 + wrapped.rows.length * 4.1 + (note.bulleted ? note.lines.length * 0.8 : 0);
  }

  function drawNote(doc, note, x, y, width, font, label, rule) {
    label(note.title, x, y);
    rule(y + 1.8, x, x + width, [230, 225, 216], 0.15);
    let cursor = y + 7;

    const wrapped = wrapNote(doc, note, width);
    wrapped.rows.forEach((row) => {
      if (note.bulleted && row.first) {
        font(9, "bold", ACCENT);
        doc.text("•", x, cursor);
      }
      font(8.2, "normal", INK_2);
      doc.text(row.text, x + wrapped.indent, cursor);
      cursor += 4.1;
      if (note.bulleted && row.first) cursor += 0.4;
    });

    return cursor + 2;
  }

  function filename(invoice) {
    const client = Util.slug((invoice.client || {}).name);
    return "Invoice_" + (invoice.number || "draft") + "_" + client + ".pdf";
  }

  function save(invoice, business) {
    build(invoice, business).save(filename(invoice));
  }

  /** Open in a new tab instead of downloading — handy for a quick check. */
  function open(invoice, business) {
    const url = build(invoice, business).output("bloburl");
    window.open(url, "_blank");
  }

  return { build, save, open, filename };
})();
