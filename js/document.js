/* The invoice document — one renderer, used by the live preview and by print.
   The PDF exporter in pdf.js redraws this same layout with vector primitives;
   keep the two in step when you change the design. */

const Doc = (() => {
  const e = Util.escapeHtml;

  /** Multi-line text becomes a bullet list; a single line stays a paragraph. */
  function renderNoteBody(text) {
    const lines = String(text || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return "";
    if (lines.length === 1) return e(lines[0]);
    return "<ul>" + lines.map((line) => "<li>" + e(line) + "</li>").join("") + "</ul>";
  }

  function clientBlock(client) {
    const lines = [client.company, client.email, client.phone, client.address]
      .map((line) => String(line || "").trim())
      .filter(Boolean)
      .join("\n");

    return (
      '<div class="doc__client-name">' +
      e(client.name || "—") +
      "</div>" +
      (lines ? '<div class="doc__client-lines">' + e(lines) + "</div>" : "")
    );
  }

  function businessLines(business) {
    return [business.address, business.email, business.phone, business.website]
      .map((line) => String(line || "").trim())
      .filter(Boolean)
      .join("\n");
  }

  function itemRows(items, showDiscount) {
    return items
      .map((item) => {
        const m = Util.itemMath(item);
        return (
          "<tr>" +
          "<td>" + e(item.description) + "</td>" +
          '<td class="c">' + e(String(m.quantity)) + "</td>" +
          "<td>" + Util.formatAmount(m.price) + "</td>" +
          (showDiscount
            ? '<td class="off">' +
              (m.discount > 0 ? "−" + Util.formatAmount(m.discount) : "—") +
              "</td>"
            : "") +
          '<td class="amt">' + Util.formatAmount(m.total) + "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  /**
   * Build the full document markup.
   * @param {object} invoice - { number, status, issueDate, dueDate, client, items, notes, terms }
   * @param {object} business - profile from Store.getBusiness()
   */
  function render(invoice, business) {
    const items = Util.billableItems(invoice.items);
    const sums = Util.invoiceMath(items);
    const showDiscount = items.some((item) => Util.itemMath(item).discount > 0);
    const bizLines = businessLines(business);
    const isPaid = invoice.status === "paid";

    const logo = business.logo || DEFAULT_LOGO_DATA_URL;

    const header =
      '<header class="doc__top">' +
      '<div class="doc__biz">' +
      (logo ? '<img class="doc__logo" src="' + e(logo) + '" alt="">' : "") +
      "<div>" +
      '<div class="doc__biz-name">' + e(business.name || "Your Business") + "</div>" +
      (business.tagline ? '<div class="doc__biz-tag">' + e(business.tagline) + "</div>" : "") +
      (bizLines ? '<div class="doc__biz-lines">' + e(bizLines) + "</div>" : "") +
      "</div>" +
      "</div>" +
      '<div class="doc__title-block">' +
      '<div class="doc__title">INVOICE</div>' +
      '<div class="doc__number">' + e(invoice.number || "—") + "</div>" +
      (isPaid ? '<div class="doc__stamp">Paid</div>' : "") +
      "</div>" +
      "</header>";

    const meta =
      '<section class="doc__meta">' +
      "<div>" +
      '<div class="doc__meta-label">Billed to</div>' +
      clientBlock(invoice.client || {}) +
      "</div>" +
      "<div>" +
      '<div class="doc__meta-label">Issued</div>' +
      '<div class="doc__date">' + e(Util.formatDate(invoice.issueDate)) + "</div>" +
      '<div class="doc__meta-label" style="margin-top:5mm">Due</div>' +
      '<div class="doc__date">' + e(Util.formatDate(invoice.dueDate)) + "</div>" +
      "</div>" +
      "<div>" +
      '<div class="doc__meta-label">Amount due</div>' +
      '<div class="doc__due-amount">' +
      Util.CURRENCY +
      "<br>" +
      Util.formatAmount(isPaid ? 0 : sums.total) +
      "</div>" +
      "</div>" +
      "</section>";

    const table = items.length
      ? '<table class="doc__table">' +
        "<thead><tr>" +
        "<th>Description</th>" +
        '<th class="c">Qty</th>' +
        "<th>Rate</th>" +
        (showDiscount ? "<th>Discount</th>" : "") +
        "<th>Amount</th>" +
        "</tr></thead>" +
        "<tbody>" + itemRows(items, showDiscount) + "</tbody>" +
        "</table>"
      : '<p class="doc__note-body" style="text-align:center;padding:12mm 0;color:#a09990">' +
        "No line items yet</p>";

    const sumsBlock =
      '<section class="doc__sums">' +
      '<div class="doc__sum-row"><span>Subtotal</span><span>' +
      Util.formatAmount(sums.subtotal) +
      "</span></div>" +
      (showDiscount
        ? '<div class="doc__sum-row doc__sum-row--off"><span>Discount</span><span>−' +
          Util.formatAmount(sums.discount) +
          "</span></div>"
        : "") +
      '<div class="doc__sum-total"><span>' +
      (isPaid ? "Total paid" : "Amount due") +
      "</span><span>" +
      Util.CURRENCY +
      " " +
      Util.formatAmount(sums.total) +
      "</span></div>" +
      "</section>";

    const notesHtml = renderNoteBody(invoice.notes);
    const termsHtml = renderNoteBody(invoice.terms);
    const notes =
      notesHtml || termsHtml
        ? '<section class="doc__notes">' +
          (notesHtml
            ? '<div><div class="doc__note-title">Payment instructions</div>' +
              '<div class="doc__note-body">' + notesHtml + "</div></div>"
            : "") +
          (termsHtml
            ? '<div><div class="doc__note-title">Terms &amp; conditions</div>' +
              '<div class="doc__note-body">' + termsHtml + "</div></div>"
            : "") +
          "</section>"
        : "";

    const footer =
      '<footer class="doc__foot">' +
      (business.footerNote ? "<strong>" + e(business.footerNote) + "</strong><br>" : "") +
      e(business.name || "") +
      (business.email ? " · " + e(business.email) : "") +
      (business.phone ? " · " + e(business.phone) : "") +
      "</footer>";

    return header + meta + table + sumsBlock + notes + footer;
  }

  return { render, renderNoteBody };
})();
