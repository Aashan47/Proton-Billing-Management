/* The invoice document — one renderer, used by the live preview and by print.
   The PDF exporter in pdf.js redraws this same layout with vector primitives;
   keep the two in step when you change the design.

   Typography note: the document is set entirely in the UI sans, not the display
   serif used in the app chrome. jsPDF's built-in faces are Helvetica and Times,
   so a sans document keeps the PDF and the preview looking like the same
   artefact instead of two different ones. */

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

  function joinLines(values) {
    return values
      .map((line) => String(line || "").trim())
      .filter(Boolean)
      .join("\n");
  }

  function metaCol(label, html) {
    return '<div><div class="doc__label">' + e(label) + "</div>" + html + "</div>";
  }

  function itemRows(items, showDiscount) {
    return items
      .map((item) => {
        const m = Util.itemMath(item);
        return (
          "<tr>" +
          '<td class="doc__cell-desc">' + e(item.description) + "</td>" +
          '<td class="c">' + e(String(m.quantity)) + "</td>" +
          "<td>" + Util.formatAmount(m.price) + "</td>" +
          (showDiscount
            ? '<td class="off">' + (m.discount > 0 ? "−" + Util.formatAmount(m.discount) : "") + "</td>"
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
    const isPaid = invoice.status === "paid";
    const logo = business.logo || DEFAULT_LOGO_DATA_URL;
    const L = Store.labelsFor(invoice, business);
    const currency = Store.currencyFor(invoice, business);

    /* --- Masthead --- */

    const masthead =
      '<header class="doc__top">' +
      '<div class="doc__biz">' +
      (logo ? '<img class="doc__logo" src="' + e(logo) + '" alt="">' : "") +
      "<div>" +
      '<div class="doc__biz-name">' + e(business.name || "Your Business") + "</div>" +
      (business.tagline ? '<div class="doc__biz-tag">' + e(business.tagline) + "</div>" : "") +
      "</div>" +
      "</div>" +
      '<div class="doc__title-block">' +
      '<div class="doc__title">' + e(L.title) + "</div>" +
      '<div class="doc__number">' + e(invoice.number || "—") + "</div>" +
      "</div>" +
      "</header>";

    /* --- Parties and dates --- */

    const client = invoice.client || {};
    const clientLines = joinLines([client.company, client.email, client.phone, client.address]);
    const bizLines = joinLines([business.address, business.email, business.phone, business.website]);

    const meta =
      '<section class="doc__meta">' +
      metaCol(
        L.billedTo,
        '<div class="doc__party-name">' + e(client.name || "—") + "</div>" +
          (clientLines ? '<div class="doc__party-lines">' + e(clientLines) + "</div>" : "")
      ) +
      metaCol(
        L.from,
        '<div class="doc__party-name doc__party-name--sm">' + e(business.name || "") + "</div>" +
          (bizLines ? '<div class="doc__party-lines">' + e(bizLines) + "</div>" : "")
      ) +
      metaCol(
        L.issued,
        '<div class="doc__date">' + e(Util.formatDate(invoice.issueDate)) + "</div>" +
          '<div class="doc__label doc__label--inline">' + e(L.due) + "</div>" +
          '<div class="doc__date">' + e(Util.formatDate(invoice.dueDate)) + "</div>"
      ) +
      "</section>";

    /* --- Hero amount --- */

    const hero =
      '<section class="doc__hero' + (isPaid ? " doc__hero--paid" : "") + '">' +
      "<div>" +
      '<div class="doc__label">' + e(isPaid ? L.totalPaid : L.amountDue) + "</div>" +
      '<div class="doc__hero-amount">' +
      '<span class="doc__hero-cur">' + e(currency) + "</span> " +
      Util.formatAmount(sums.total) +
      "</div>" +
      "</div>" +
      '<div class="doc__hero-side">' +
      (isPaid
        ? '<span class="doc__stamp">' + e(L.paidStamp) + "</span>"
        : '<div class="doc__label">' + e(L.payableBy) + '</div><div class="doc__date">' +
          e(Util.formatDate(invoice.dueDate)) +
          "</div>") +
      "</div>" +
      "</section>";

    /* --- Line items --- */

    /* Fixed column widths, matching the PDF's millimetre grid, so a long
       description reflows inside its own column instead of stretching the
       table and pushing Qty/Rate/Amount off the page. */
    const colgroup =
      "<colgroup>" +
      "<col>" +
      '<col class="doc__col-qty">' +
      '<col class="doc__col-num">' +
      (showDiscount ? '<col class="doc__col-num">' : "") +
      '<col class="doc__col-num">' +
      "</colgroup>";

    const table = items.length
      ? '<table class="doc__table">' +
        colgroup +
        "<thead><tr>" +
        "<th>" + e(L.description) + "</th>" +
        '<th class="c">' + e(L.qty) + "</th>" +
        "<th>" + e(L.rate) + "</th>" +
        (showDiscount ? "<th>" + e(L.discount) + "</th>" : "") +
        "<th>" + e(L.amount) + "</th>" +
        "</tr></thead>" +
        "<tbody>" + itemRows(items, showDiscount) + "</tbody>" +
        "</table>"
      : '<p class="doc__blank">No line items yet</p>';

    const sumsBlock =
      '<section class="doc__sums">' +
      '<div class="doc__sum-row"><span>' + e(L.subtotal) + "</span><span>" +
      Util.formatAmount(sums.subtotal) +
      "</span></div>" +
      (showDiscount
        ? '<div class="doc__sum-row doc__sum-row--off"><span>' + e(L.discount) + "</span><span>−" +
          Util.formatAmount(sums.discount) +
          "</span></div>"
        : "") +
      '<div class="doc__sum-total">' +
      '<span class="doc__label">' + e(isPaid ? L.totalPaid : L.totalDue) + "</span>" +
      "<span>" + e(Util.money(sums.total, currency)) + "</span>" +
      "</div>" +
      "</section>";

    /* --- Notes --- */

    const notesHtml = renderNoteBody(invoice.notes);
    const termsHtml = renderNoteBody(invoice.terms);
    const notes =
      notesHtml || termsHtml
        ? '<section class="doc__notes' + (notesHtml && termsHtml ? " doc__notes--two" : "") + '">' +
          (notesHtml
            ? '<div><div class="doc__label doc__label--rule">' + e(L.paymentInstructions) + "</div>" +
              '<div class="doc__note-body">' + notesHtml + "</div></div>"
            : "") +
          (termsHtml
            ? '<div><div class="doc__label doc__label--rule">' + e(L.terms) + "</div>" +
              '<div class="doc__note-body">' + termsHtml + "</div></div>"
            : "") +
          "</section>"
        : "";

    const footer =
      '<footer class="doc__foot">' +
      "<span>" + e(business.name || "") + "</span>" +
      (business.footerNote ? "<span>" + e(business.footerNote) + "</span>" : "<span></span>") +
      "<span>" + e(invoice.number || "") + "</span>" +
      "</footer>";

    return (
      '<div class="doc__band"></div>' +
      masthead +
      meta +
      hero +
      table +
      sumsBlock +
      notes +
      footer
    );
  }

  return { render, renderNoteBody };
})();
