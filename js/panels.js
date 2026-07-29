/* Slide-over panels: business settings, invoice history, saved clients, backup. */

const Panels = (() => {
  const $ = Util.$;
  const $$ = Util.$$;

  let lastFocus = null;

  /* --- Open / close --------------------------------------------------------- */

  function open(id) {
    lastFocus = document.activeElement;
    closeAll(true);
    $("#scrim").hidden = false;
    const drawer = $("#" + id);
    drawer.hidden = false;
    document.body.style.overflow = "hidden";

    const first = drawer.querySelector("input, select, textarea, button");
    if (first) first.focus();
  }

  function closeAll(keepScrim) {
    $$(".drawer").forEach((drawer) => (drawer.hidden = true));
    if (!keepScrim) {
      $("#scrim").hidden = true;
      document.body.style.overflow = "";
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
      lastFocus = null;
    }
  }

  /* --- Field factory --------------------------------------------------------- */

  function field(id, labelText, options) {
    const config = options || {};
    const wrap = document.createElement("div");
    wrap.className = "field";

    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = labelText;
    wrap.appendChild(label);

    const input = document.createElement(config.rows ? "textarea" : "input");
    input.id = id;
    if (config.rows) input.rows = config.rows;
    else input.type = config.type || "text";
    if (config.placeholder) input.placeholder = config.placeholder;
    if (config.min !== undefined) input.min = config.min;
    if (config.step !== undefined) input.step = config.step;
    input.value = config.value === undefined || config.value === null ? "" : config.value;
    wrap.appendChild(input);

    if (config.hint) {
      const hint = document.createElement("div");
      hint.className = "field__hint";
      hint.textContent = config.hint;
      wrap.appendChild(hint);
    }
    return wrap;
  }

  function section(title, nodes) {
    const wrap = document.createElement("div");
    wrap.className = "drawer__section";
    const heading = document.createElement("div");
    heading.className = "drawer__section-title";
    heading.textContent = title;
    wrap.appendChild(heading);
    nodes.forEach((node) => wrap.appendChild(node));
    return wrap;
  }

  function grid(nodes) {
    const wrap = document.createElement("div");
    wrap.className = "grid grid--2";
    nodes.forEach((node) => wrap.appendChild(node));
    return wrap;
  }

  /* --- Settings -------------------------------------------------------------- */

  let pendingLogo = null; // data URL staged until Save is pressed

  function buildSettings() {
    const business = Store.getBusiness();
    const body = $("#settingsBody");
    body.innerHTML = "";
    pendingLogo = null;

    /* Identity */
    const logoRow = document.createElement("div");
    logoRow.className = "logopick";
    const preview = document.createElement("img");
    preview.className = "logopick__preview";
    preview.id = "logoPreview";
    preview.alt = "Current logo";
    preview.src = business.logo || DEFAULT_LOGO_DATA_URL;

    const actions = document.createElement("div");
    actions.className = "logopick__actions";

    const upload = document.createElement("button");
    upload.type = "button";
    upload.className = "btn btn--sm";
    upload.textContent = "Upload logo";

    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "btn btn--sm btn--danger";
    reset.textContent = "Reset";

    const filePicker = document.createElement("input");
    filePicker.type = "file";
    filePicker.accept = "image/png,image/jpeg,image/webp";
    filePicker.hidden = true;

    const note = document.createElement("div");
    note.className = "field__hint";
    note.textContent = "Square PNG works best. Stored on this device only.";

    upload.addEventListener("click", () => filePicker.click());
    reset.addEventListener("click", () => {
      pendingLogo = "";
      preview.src = DEFAULT_LOGO_DATA_URL;
    });
    filePicker.addEventListener("change", () => {
      const file = filePicker.files && filePicker.files[0];
      if (!file) return;
      // A big logo is embedded in every PDF and eats the localStorage quota.
      if (file.size > 900 * 1024) {
        App.toast("That image is over 900KB — please use a smaller one.", "error");
        filePicker.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        pendingLogo = String(reader.result);
        preview.src = pendingLogo;
      };
      reader.onerror = () => App.toast("Could not read that image.", "error");
      reader.readAsDataURL(file);
    });

    actions.appendChild(upload);
    actions.appendChild(reset);
    logoRow.appendChild(preview);
    logoRow.appendChild(actions);
    logoRow.appendChild(filePicker);

    body.appendChild(
      section("Identity", [
        logoRow,
        note,
        field("setName", "Business name", { value: business.name }),
        field("setTagline", "Tagline", { value: business.tagline }),
      ])
    );

    body.appendChild(
      section("Contact", [
        field("setAddress", "Address", { value: business.address, rows: 3 }),
        grid([
          field("setEmail", "Email", { value: business.email, type: "email" }),
          field("setPhone", "Phone", { value: business.phone, type: "tel" }),
        ]),
        field("setWebsite", "Website", { value: business.website, placeholder: "protonstudio.com" }),
      ])
    );

    body.appendChild(
      section("Invoice defaults", [
        grid([
          field("setPrefix", "Number prefix", { value: business.numberPrefix }),
          field("setNext", "Next number", {
            value: business.nextNumber,
            type: "number",
            min: 1,
            step: 1,
          }),
        ]),
        field("setDueDays", "Payment terms (days)", {
          value: business.defaultDueDays,
          type: "number",
          min: 0,
          step: 1,
          hint: "Used to set the due date on every new invoice.",
        }),
        field("setNotes", "Default payment instructions", {
          value: business.defaultPaymentInstructions,
          rows: 3,
        }),
        field("setTerms", "Default terms & conditions", {
          value: business.defaultTerms,
          rows: 4,
          hint: "One per line — each becomes a bullet on the invoice.",
        }),
        field("setFooter", "Footer note", { value: business.footerNote }),
      ])
    );
  }

  function saveSettings() {
    const next = {
      name: $("#setName").value.trim(),
      tagline: $("#setTagline").value.trim(),
      address: $("#setAddress").value.trim(),
      email: $("#setEmail").value.trim(),
      phone: $("#setPhone").value.trim(),
      website: $("#setWebsite").value.trim(),
      numberPrefix: $("#setPrefix").value.trim(),
      nextNumber: Math.max(1, Util.toNumber($("#setNext").value, 1)),
      defaultDueDays: Math.max(0, Util.toNumber($("#setDueDays").value, 30)),
      defaultPaymentInstructions: $("#setNotes").value,
      defaultTerms: $("#setTerms").value,
      footerNote: $("#setFooter").value.trim(),
    };
    if (pendingLogo !== null) next.logo = pendingLogo;

    if (!Store.saveBusiness(next)) {
      App.toast("Could not save — this device's storage is full.", "error");
      return;
    }
    App.reloadBusiness();
    closeAll();
    App.toast("Settings saved");
  }

  /* --- History ---------------------------------------------------------------- */

  function invoiceCard(invoice) {
    const sums = Util.invoiceMath(invoice.items);
    const card = document.createElement("article");
    card.className = "hist__item";

    const number = document.createElement("div");
    number.className = "hist__num";
    number.textContent = invoice.number || "—";

    const amount = document.createElement("div");
    amount.className = "hist__amount";
    amount.textContent = Util.money(sums.total);

    const sub = document.createElement("div");
    sub.className = "hist__sub";
    sub.textContent =
      ((invoice.client && invoice.client.name) || "No client") +
      " · " +
      Util.formatDateShort(invoice.issueDate);

    const meta = document.createElement("div");
    meta.className = "hist__meta";
    const status = document.createElement("span");
    status.className = "status status--" + (invoice.status || "draft");
    status.textContent = invoice.status || "draft";
    meta.appendChild(status);

    const actions = document.createElement("div");
    actions.className = "hist__actions";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "btn btn--sm";
    openBtn.textContent = "Open";
    openBtn.addEventListener("click", () => {
      App.loadInvoice(invoice.id);
      closeAll();
    });

    const dupBtn = document.createElement("button");
    dupBtn.type = "button";
    dupBtn.className = "btn btn--sm";
    dupBtn.textContent = "Duplicate";
    dupBtn.addEventListener("click", () => {
      App.duplicateInvoice(invoice.id);
      closeAll();
    });

    const pdfBtn = document.createElement("button");
    pdfBtn.type = "button";
    pdfBtn.className = "btn btn--sm";
    pdfBtn.textContent = "PDF";
    pdfBtn.addEventListener("click", () => {
      try {
        Pdf.save(invoice, Store.getBusiness());
        App.toast("PDF downloaded");
      } catch (error) {
        App.toast(error.message || "Could not build the PDF.", "error");
      }
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn--sm btn--danger";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => {
      if (!confirm("Delete " + (invoice.number || "this invoice") + " permanently?")) return;
      Store.deleteInvoice(invoice.id);
      refreshHistory();
      App.toast("Invoice deleted", "info");
    });

    [openBtn, dupBtn, pdfBtn, delBtn].forEach((button) => actions.appendChild(button));
    [number, amount, sub, meta, actions].forEach((node) => card.appendChild(node));
    return card;
  }

  function clientCard(client) {
    const card = document.createElement("article");
    card.className = "hist__item";

    const name = document.createElement("div");
    name.className = "hist__num";
    name.textContent = client.name;

    const sub = document.createElement("div");
    sub.className = "hist__sub";
    sub.textContent = [client.company, client.email, client.phone].filter(Boolean).join(" · ") || "—";

    const spacer = document.createElement("div");

    const actions = document.createElement("div");
    actions.className = "hist__actions";

    const useBtn = document.createElement("button");
    useBtn.type = "button";
    useBtn.className = "btn btn--sm";
    useBtn.textContent = "Use on this invoice";
    useBtn.addEventListener("click", () => {
      App.applyClient(client);
      closeAll();
      App.toast("Billing " + client.name, "info");
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn--sm btn--danger";
    delBtn.textContent = "Forget";
    delBtn.addEventListener("click", () => {
      Store.deleteClient(client.name);
      refreshHistory();
    });

    actions.appendChild(useBtn);
    actions.appendChild(delBtn);
    [name, spacer, sub, actions].forEach((node) => card.appendChild(node));
    return card;
  }

  function emptyState(title, body) {
    const wrap = document.createElement("div");
    wrap.className = "empty";
    const heading = document.createElement("div");
    heading.className = "empty__title";
    heading.textContent = title;
    const text = document.createElement("div");
    text.className = "empty__body";
    text.textContent = body;
    wrap.appendChild(heading);
    wrap.appendChild(text);
    return wrap;
  }

  function refreshHistory() {
    const body = $("#historyBody");
    if (!body) return;

    const query = ($("#historySearch") ? $("#historySearch").value : "").trim().toLowerCase();
    body.innerHTML = "";

    let invoices = Store.getInvoices();
    if (query) {
      invoices = invoices.filter((invoice) =>
        [invoice.number, invoice.client && invoice.client.name, invoice.client && invoice.client.company]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    const invoiceWrap = document.createElement("div");
    invoiceWrap.className = "drawer__section";
    const invoiceTitle = document.createElement("div");
    invoiceTitle.className = "drawer__section-title";
    invoiceTitle.textContent = "Invoices (" + invoices.length + ")";
    invoiceWrap.appendChild(invoiceTitle);

    if (invoices.length === 0) {
      invoiceWrap.appendChild(
        emptyState(
          query ? "Nothing matches" : "No saved invoices yet",
          query
            ? "Try a different invoice number or client name."
            : "Press Save on an invoice and it will appear here."
        )
      );
    } else {
      const list = document.createElement("div");
      list.className = "hist";
      invoices.forEach((invoice) => list.appendChild(invoiceCard(invoice)));
      invoiceWrap.appendChild(list);
    }
    body.appendChild(invoiceWrap);

    let clients = Store.getClients();
    if (query) {
      clients = clients.filter((client) =>
        [client.name, client.company, client.email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    if (clients.length) {
      const clientWrap = document.createElement("div");
      clientWrap.className = "drawer__section";
      const clientTitle = document.createElement("div");
      clientTitle.className = "drawer__section-title";
      clientTitle.textContent = "Clients (" + clients.length + ")";
      clientWrap.appendChild(clientTitle);

      const list = document.createElement("div");
      list.className = "hist";
      clients.forEach((client) => list.appendChild(clientCard(client)));
      clientWrap.appendChild(list);
      body.appendChild(clientWrap);
    }
  }

  /* --- Backup ----------------------------------------------------------------- */

  function exportBackup() {
    const payload = Store.exportAll();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    Util.downloadBlob(blob, "proton-billing-backup-" + Util.today() + ".json");
    App.toast(
      "Backed up " + payload.invoices.length + " invoice" + (payload.invoices.length === 1 ? "" : "s")
    );
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = Store.importAll(JSON.parse(String(reader.result)));
        App.reloadBusiness();
        refreshHistory();
        buildSettings();
        App.toast(
          "Imported " +
            result.invoicesAdded +
            " invoice" +
            (result.invoicesAdded === 1 ? "" : "s") +
            " and " +
            result.clientsAdded +
            " client" +
            (result.clientsAdded === 1 ? "" : "s")
        );
      } catch (error) {
        console.error("Import failed:", error);
        App.toast(error.message || "That backup could not be read.", "error");
      }
    };
    reader.onerror = () => App.toast("Could not read that file.", "error");
    reader.readAsText(file);
  }

  /* --- Wiring ------------------------------------------------------------------ */

  function init() {
    $("#scrim").addEventListener("click", () => closeAll());
    $$("[data-close]").forEach((button) => button.addEventListener("click", () => closeAll()));

    $("#btnSettings").addEventListener("click", () => {
      buildSettings();
      open("drawerSettings");
    });

    $("#btnHistory").addEventListener("click", openHistory);
    $("#settingsSave").addEventListener("click", saveSettings);
    $("#btnExport").addEventListener("click", exportBackup);

    const picker = $("#importFile");
    $("#btnImport").addEventListener("click", () => picker.click());
    picker.addEventListener("change", () => {
      const file = picker.files && picker.files[0];
      if (file) importBackup(file);
      picker.value = "";
    });

    $("#historySearch").addEventListener("input", Util.debounce(refreshHistory, 120));
  }

  function openHistory() {
    refreshHistory();
    open("drawerHistory");
  }

  return { init, openHistory, closeAll, refreshHistory };
})();

document.addEventListener("DOMContentLoaded", Panels.init);
