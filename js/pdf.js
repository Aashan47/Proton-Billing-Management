/* Vector PDF export (jsPDF + autoTable).
   Real text, not a screenshot: selectable, searchable, sharp at any zoom,
   ~30KB per invoice, and it flows across as many pages as it needs.
   Mirrors the layout in document.js — change both together. */

const Pdf = (() => {
  const PAGE_W = 210;
  const PAGE_H = 297;
  const M = 15; // left/right margin
  const CONTENT_W = PAGE_W - M * 2;
  const TOP = 16;
  const CONT_TOP = 24; // top of content on continuation pages
  const FOOT_H = 18; // reserved strip at the bottom of every page

  const INK = [28, 25, 23];
  const INK_2 = [68, 64, 60];
  const MUTED = [111, 105, 97];
  const ACCENT = [180, 83, 9];
  const BORDER = [230, 225, 216];
  const SUCCESS = [21, 128, 61];
  const WHITE = [255, 255, 255];

  /* jsPDF's built-in fonts encode WinAnsi, which covers en/em dashes, curly
     quotes and bullets — but not U+2212 MINUS. Fold only what would otherwise
     come out as garbage, so the PDF keeps the typography the preview shows. */
  function ascii(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/−/g, "-")
      .replace(/ /g, " ");
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

    const setFont = (size, style, color) => {
      doc.setFont("helvetica", style || "normal");
      doc.setFontSize(size);
      doc.setTextColor.apply(doc, color || INK);
    };

    /* --- Header (page 1) ------------------------------------------------- */

    let y = TOP;
    const logo = business.logo || (typeof DEFAULT_LOGO_DATA_URL !== "undefined" ? DEFAULT_LOGO_DATA_URL : "");
    const format = imageFormat(logo);
    let textX = M;

    if (format) {
      try {
        doc.addImage(logo, format, M, y, 19, 19, undefined, "MEDIUM");
        textX = M + 24;
      } catch (error) {
        console.warn("Could not draw the logo, falling back to text only:", error);
      }
    }

    setFont(16, "bold", INK);
    doc.text(ascii(business.name || "Your Business"), textX, y + 6);

    let bizY = y + 6;
    if (business.tagline) {
      setFont(8.2, "normal", MUTED);
      doc.text(ascii(business.tagline), textX, (bizY += 4.8));
    }

    const bizLines = [business.address, business.email, business.phone, business.website]
      .map((line) => String(line || "").trim())
      .filter(Boolean)
      .join("\n")
      .split("\n");

    setFont(7.8, "normal", MUTED);
    bizY += 2.2;
    bizLines.forEach((line) => {
      doc.text(ascii(line), textX, (bizY += 3.6));
    });

    // Title block, right-aligned
    setFont(23, "bold", INK);
    doc.text("INVOICE", PAGE_W - M, y + 8, { align: "right" });

    setFont(10, "bold", ACCENT);
    doc.text(ascii(invoice.number || ""), PAGE_W - M, y + 14, { align: "right" });

    if (isPaid) {
      setFont(7.2, "bold", SUCCESS);
      const label = "PAID";
      const w = doc.getTextWidth(label) + 7;
      doc.setDrawColor.apply(doc, SUCCESS);
      doc.setLineWidth(0.3);
      doc.roundedRect(PAGE_W - M - w, y + 17, w, 5.4, 2.7, 2.7, "S");
      doc.text(label, PAGE_W - M - w / 2, y + 20.6, { align: "center" });
    }

    y = Math.max(bizY + 4, y + 24);
    doc.setDrawColor.apply(doc, INK);
    doc.setLineWidth(0.5);
    doc.line(M, y, PAGE_W - M, y);

    /* --- Meta row: billed to / dates / amount due ------------------------- */

    y += 7;
    const colB = M + CONTENT_W * 0.52;
    const colC = PAGE_W - M;
    const label = (str, x, yy, align) => {
      setFont(6.8, "bold", MUTED);
      doc.text(ascii(str).toUpperCase(), x, yy, { align: align || "left", charSpace: 0.4 });
    };

    label("Billed to", M, y);
    label("Issued", colB, y);
    label("Amount due", colC, y, "right");

    const client = invoice.client || {};
    setFont(10.5, "bold", INK);
    doc.text(ascii(client.name || "-"), M, y + 5.5);

    const clientLines = [client.company, client.email, client.phone, client.address]
      .map((line) => String(line || "").trim())
      .filter(Boolean)
      .join("\n")
      .split("\n")
      .filter(Boolean);

    setFont(8, "normal", INK_2);
    let clientY = y + 5.5;
    clientLines.forEach((line) => {
      doc.splitTextToSize(ascii(line), CONTENT_W * 0.46).forEach((wrapped) => {
        doc.text(wrapped, M, (clientY += 4.1));
      });
    });

    setFont(9.5, "normal", INK);
    doc.text(ascii(Util.formatDate(invoice.issueDate)), colB, y + 5.5);
    label("Due", colB, y + 11.5);
    setFont(9.5, "normal", INK);
    doc.text(ascii(Util.formatDate(invoice.dueDate)), colB, y + 17);

    setFont(8, "normal", MUTED);
    doc.text(Util.CURRENCY, colC, y + 5, { align: "right" });
    setFont(14, "bold", INK);
    doc.text(Util.formatAmount(isPaid ? 0 : sums.total), colC, y + 11.5, { align: "right" });

    const tableStart = Math.max(clientY, y + 17) + 9;

    /* --- Line items ------------------------------------------------------ */

    const head = ["Description", "Qty", "Rate"];
    if (showDiscount) head.push("Discount");
    head.push("Amount");

    const body = items.map((item) => {
      const m = Util.itemMath(item);
      const row = [
        ascii(item.description),
        String(m.quantity),
        Util.formatAmount(m.price),
      ];
      // ASCII hyphen: autoTable draws cells verbatim, without the ascii() fold.
      if (showDiscount) row.push(m.discount > 0 ? "-" + Util.formatAmount(m.discount) : "");
      row.push(Util.formatAmount(m.total));
      return row;
    });

    const numW = 22;
    const columnStyles = showDiscount
      ? {
          0: { halign: "left", cellWidth: CONTENT_W - numW * 3 - 16 },
          1: { halign: "center", cellWidth: 16 },
          2: { halign: "right", cellWidth: numW },
          3: { halign: "right", cellWidth: numW, textColor: ACCENT },
          4: { halign: "right", cellWidth: numW, fontStyle: "bold", textColor: INK },
        }
      : {
          0: { halign: "left", cellWidth: CONTENT_W - numW * 2 - 16 },
          1: { halign: "center", cellWidth: 16 },
          2: { halign: "right", cellWidth: numW },
          3: { halign: "right", cellWidth: numW, fontStyle: "bold", textColor: INK },
        };

    let firstTablePage = true;

    doc.autoTable({
      head: [head.map((cell) => cell.toUpperCase())],
      body: body,
      startY: tableStart,
      margin: { left: M, right: M, top: CONT_TOP, bottom: FOOT_H },
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 8.4,
        textColor: INK_2,
        cellPadding: { top: 2.4, bottom: 2.4, left: 2.6, right: 2.6 },
        lineWidth: 0,
        overflow: "linebreak",
        valign: "top",
      },
      headStyles: {
        fillColor: INK,
        textColor: WHITE,
        fontStyle: "bold",
        fontSize: 6.8,
        cellPadding: { top: 2.4, bottom: 2.4, left: 2.6, right: 2.6 },
      },
      columnStyles: columnStyles,
      // Hairline under each row — cleaner than autoTable's full grid.
      didDrawCell: function (data) {
        if (data.section !== "body") return;
        doc.setDrawColor.apply(doc, BORDER);
        doc.setLineWidth(0.15);
        doc.line(
          data.cell.x,
          data.cell.y + data.cell.height,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height
        );
      },
      didDrawPage: function () {
        if (firstTablePage) {
          firstTablePage = false;
          return;
        }
        // Continuation pages get a light caption above the repeated header.
        setFont(7, "normal", MUTED);
        doc.text(
          ascii((invoice.number || "Invoice") + " · continued"),
          M,
          CONT_TOP - 5
        );
      },
    });

    /* --- Totals ---------------------------------------------------------- */

    let cursor = doc.lastAutoTable.finalY + 8;
    const boxW = 74;
    const boxX = PAGE_W - M - boxW;

    cursor = ensureSpace(doc, cursor, showDiscount ? 26 : 21);

    const sumRow = (name, value, color) => {
      setFont(8.4, "normal", MUTED);
      doc.text(ascii(name), boxX, cursor);
      setFont(8.4, "normal", color || INK);
      doc.text(value, PAGE_W - M, cursor, { align: "right" });
      cursor += 5.2;
    };

    sumRow("Subtotal", Util.formatAmount(sums.subtotal));
    if (showDiscount) sumRow("Discount", "-" + Util.formatAmount(sums.discount), ACCENT);

    doc.setFillColor.apply(doc, INK);
    doc.roundedRect(boxX, cursor - 1, boxW, 11, 1.5, 1.5, "F");
    setFont(7.4, "bold", WHITE);
    doc.text(isPaid ? "TOTAL PAID" : "AMOUNT DUE", boxX + 4, cursor + 5.4, { charSpace: 0.4 });
    setFont(12, "bold", WHITE);
    doc.text(
      Util.CURRENCY + " " + Util.formatAmount(sums.total),
      PAGE_W - M - 4,
      cursor + 5.6,
      { align: "right" }
    );
    cursor += 18;

    /* --- Notes and terms -------------------------------------------------- */

    cursor = drawNoteBlock(doc, cursor, "Payment instructions", invoice.notes, setFont);
    cursor = drawNoteBlock(doc, cursor, "Terms & conditions", invoice.terms, setFont);

    /* --- Footer on every page --------------------------------------------- */

    const pages = doc.internal.getNumberOfPages();
    const footLine = [business.name, business.email, business.phone]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join("  ·  ");

    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      const fy = PAGE_H - 12;

      doc.setDrawColor.apply(doc, BORDER);
      doc.setLineWidth(0.2);
      doc.line(M, fy - 4.5, PAGE_W - M, fy - 4.5);

      if (business.footerNote) {
        setFont(7.4, "bold", INK);
        doc.text(ascii(business.footerNote), PAGE_W / 2, fy - 0.6, { align: "center" });
      }

      setFont(6.8, "normal", MUTED);
      if (footLine) {
        doc.text(ascii(footLine), PAGE_W / 2, fy + 3.4, { align: "center" });
      }
      if (pages > 1) {
        doc.text("Page " + page + " of " + pages, PAGE_W - M, fy + 3.4, { align: "right" });
      }
    }

    return doc;
  }

  /** Move to a new page if `needed` mm will not fit above the footer strip. */
  function ensureSpace(doc, y, needed) {
    if (y + needed <= PAGE_H - FOOT_H) return y;
    doc.addPage();
    return CONT_TOP;
  }

  function drawNoteBlock(doc, y, title, text, setFont) {
    const lines = String(text || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return y;

    const bulleted = lines.length > 1;
    y = ensureSpace(doc, y + 4, 16);

    setFont(6.8, "bold", MUTED);
    doc.text(ascii(title).toUpperCase(), M, y, { charSpace: 0.4 });
    doc.setDrawColor.apply(doc, BORDER);
    doc.setLineWidth(0.2);
    doc.line(M, y + 1.8, PAGE_W - M, y + 1.8);
    y += 6.5;

    const indent = bulleted ? 4 : 0;
    lines.forEach((line) => {
      setFont(8.4, "normal", INK_2);
      const wrapped = doc.splitTextToSize(ascii(line), CONTENT_W - indent);
      wrapped.forEach((part, index) => {
        y = ensureSpace(doc, y, 6);
        if (bulleted && index === 0) {
          setFont(10, "bold", ACCENT);
          doc.text("•", M, y);
          setFont(8.4, "normal", INK_2);
        }
        doc.text(part, M + indent, y);
        y += 4.4;
      });
      if (bulleted) y += 0.8;
    });

    return y + 2;
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
