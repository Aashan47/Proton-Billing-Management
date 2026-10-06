/* Editor state, live preview, validation, toasts, shortcuts, autosave. */

const App = (() => {
  const $ = Util.$;
  const $$ = Util.$$;

  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash:
      '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>',
  };

  function icon(name, size) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
      (size ? ' style="width:' + size + 'px;height:' + size + 'px"' : "") +
      ">" +
      ICONS[name] +
      "</svg>"
    );
  }

  /* --- State -------------------------------------------------------------- */

  let state = blankInvoice();
  let business = Store.DEFAULT_BUSINESS;
  let dirty = false;
  let previewFrame = null;

  function blankItem() {
    return { id: Util.uid("item"), description: "", price: "", quantity: 1, discount: 0 };
  }

  function blankInvoice() {
    const profile = typeof Store !== "undefined" ? Store.getBusiness() : Store.DEFAULT_BUSINESS;
    const issueDate = Util.today();
    return {
      id: null,
      number: Store.peekNumber(),
      status: "draft",
      issueDate: issueDate,
      dueDate: Util.addDays(issueDate, Util.toNumber(profile.defaultDueDays, 30)),
      client: { name: "", company: "", email: "", phone: "", address: "" },
      items: [blankItem()],
      notes: profile.defaultPaymentInstructions || "",
      terms: profile.defaultTerms || "",
      currency: Store.currencyFor({}, profile),
      labels: Store.labelsFor({}, profile),
    };
  }

  /** Invoices saved before wording was editable get the current defaults. */
  function withWording(invoice) {
    const profile = Store.getBusiness();
    invoice.labels = Object.assign(Store.labelsFor({}, profile), invoice.labels || {});
    invoice.currency = Store.currencyFor(invoice, profile);
    return invoice;
  }

  function getState() {
    return state;
  }

  function getBusiness() {
    return business;
  }

  /* --- Toasts ------------------------------------------------------------- */

  function toast(message, kind) {
    const host = $("#toasts");
    if (!host) return;

    const el = document.createElement("div");
    el.className = "toast" + (kind ? " toast--" + kind : "");
    el.setAttribute("role", kind === "error" ? "alert" : "status");
    el.innerHTML =
      icon(kind === "error" ? "alert" : kind === "info" ? "info" : "check") +
      "<span></span>";
    el.querySelector("span").textContent = message;
    host.appendChild(el);

    setTimeout(() => {
      el.classList.add("is-leaving");
      setTimeout(() => el.remove(), 220);
    }, kind === "error" ? 4200 : 2600);
  }

  /* --- Rendering: line items --------------------------------------------- */

  function renderItems() {
    const host = $("#items");
    host.innerHTML = "";

    if (state.items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "items__empty";
      empty.textContent = "No line items yet — add your first service.";
      host.appendChild(empty);
      return;
    }

    state.items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "item";
      row.dataset.id = item.id;
      // Each control carries its own label. The label text is hidden on wide
      // screens (the column header covers it) and shown once the row stacks.
      const n = index + 1;
      row.innerHTML =
        '<label class="item__f item__f--desc"><span>Description</span>' +
        '<input class="item__desc" type="text" data-k="description" ' +
        'aria-label="Item ' + n + ' description" placeholder="e.g. Video production — brand film"></label>' +
        '<label class="item__f"><span>Qty</span>' +
        '<input class="item__qty" type="number" data-k="quantity" min="0" step="1" ' +
        'aria-label="Item ' + n + ' quantity" placeholder="1"></label>' +
        '<label class="item__f"><span>Rate</span>' +
        '<input type="number" data-k="price" min="0" step="0.01" ' +
        'aria-label="Item ' + n + ' rate in ' + Util.escapeHtml(Store.currencyFor(state, business)) + '" placeholder="0.00"></label>' +
        '<label class="item__f"><span>Off %</span>' +
        '<input type="number" data-k="discount" min="0" max="100" step="0.1" ' +
        'aria-label="Item ' + n + ' discount percent" placeholder="0"></label>' +
        '<div class="item__f item__f--total"><span>Amount</span>' +
        '<div class="item__total num" data-total></div></div>' +
        '<button type="button" class="item__remove" data-remove ' +
        'aria-label="Remove item ' + n + '" title="Remove item">' +
        icon("trash") +
        "</button>";

      row.querySelector('[data-k="description"]').value = item.description || "";
      row.querySelector('[data-k="quantity"]').value = item.quantity;
      row.querySelector('[data-k="price"]').value = item.price;
      row.querySelector('[data-k="discount"]').value = item.discount;

      host.appendChild(row);
      paintItemTotal(row, item);
    });
  }

  function paintItemTotal(row, item) {
    row.querySelector("[data-total]").textContent = Util.formatAmount(Util.itemMath(item).total);
  }

  function addItem(focus) {
    state.items.push(blankItem());
    renderItems();
    refresh();
    if (focus !== false) {
      const rows = $$(".item");
      const last = rows[rows.length - 1];
      if (last) last.querySelector('[data-k="description"]').focus();
    }
  }

  function removeItem(id) {
    state.items = state.items.filter((item) => item.id !== id);
    if (state.items.length === 0) state.items.push(blankItem());
    renderItems();
    refresh();
  }

  /* --- Rendering: totals, preview ---------------------------------------- */

  function renderTotals() {
    const billable = Util.billableItems(state.items);
    const sums = Util.invoiceMath(state.items);
    const hasDiscount = sums.discount > 0;

    $("#sumSubtotal").textContent = Util.formatAmount(sums.subtotal);
    $("#sumDiscount").textContent = "−" + Util.formatAmount(sums.discount);
    $("#sumTotal").textContent = Util.money(sums.total, Store.currencyFor(state, business));
    $("#rowDiscount").hidden = !hasDiscount;
    $("#itemCount").textContent =
      billable.length + (billable.length === 1 ? " item" : " items");
  }

  function renderPreview() {
    if (previewFrame) cancelAnimationFrame(previewFrame);
    previewFrame = requestAnimationFrame(() => {
      previewFrame = null;
      $("#paper").innerHTML = Doc.render(state, business);
      fitPaper();
    });
  }

  /** Scale the A4 page down so it fits the preview column. */
  function fitPaper() {
    const fit = $("#paperFit");
    const paper = $("#paper");
    if (!fit || !paper) return;

    const available = fit.clientWidth;
    const natural = paper.offsetWidth;
    if (!available || !natural) return;

    const scale = Math.min(1, available / natural);
    fit.style.setProperty("--paper-scale", scale);
    fit.style.height = paper.offsetHeight * scale + "px";
  }

  function renderMeta() {
    const due = Util.daysUntil(state.dueDate);
    const el = $("#dueHint");
    if (due === null) {
      el.textContent = "";
    } else if (state.status === "paid") {
      el.textContent = "Settled";
    } else if (due < 0) {
      el.textContent = Math.abs(due) + (Math.abs(due) === 1 ? " day overdue" : " days overdue");
    } else if (due === 0) {
      el.textContent = "Due today";
    } else {
      el.textContent = "Due in " + due + (due === 1 ? " day" : " days");
    }

    $("#savedHint").textContent = state.id ? "Saved" : dirty ? "Unsaved draft" : "New invoice";
  }

  /** Recompute everything that depends on state. */
  function refresh() {
    renderTotals();
    renderMeta();
    renderPreview();
    queueDraftSave();
  }

  /* --- Form <-> state ----------------------------------------------------- */

  const FIELD_MAP = {
    invoiceNumber: (value) => (state.number = value),
    issueDate: (value) => (state.issueDate = value),
    dueDate: (value) => (state.dueDate = value),
    clientName: (value) => (state.client.name = value),
    clientCompany: (value) => (state.client.company = value),
    clientEmail: (value) => (state.client.email = value),
    clientPhone: (value) => (state.client.phone = value),
    clientAddress: (value) => (state.client.address = value),
    paymentNotes: (value) => (state.notes = value),
    terms: (value) => (state.terms = value),
  };

  function fillForm() {
    $("#invoiceNumber").value = state.number || "";
    $("#issueDate").value = state.issueDate || "";
    $("#dueDate").value = state.dueDate || "";
    $("#clientName").value = state.client.name || "";
    $("#clientCompany").value = state.client.company || "";
    $("#clientEmail").value = state.client.email || "";
    $("#clientPhone").value = state.client.phone || "";
    $("#clientAddress").value = state.client.address || "";
    $("#paymentNotes").value = state.notes || "";
    $("#terms").value = state.terms || "";
    $("#status").value = state.status || "draft";
    fillWording();
    renderItems();
    refresh();
  }

  /* --- Invoice wording ----------------------------------------------------- */

  // [key, field label]. "currency" lives on the invoice itself, not in labels.
  const WORDING_GROUPS = [
    ["Heading", [["title", "Document title"], ["currency", "Currency"]]],
    [
      "Parties & dates",
      [["billedTo", "Billed to"], ["from", "From"], ["issued", "Issued"], ["due", "Due"], ["payableBy", "Payable by"]],
    ],
    [
      "Line items",
      [["description", "Description"], ["qty", "Qty"], ["rate", "Rate"], ["discount", "Discount"], ["amount", "Amount"]],
    ],
    [
      "Totals",
      [
        ["subtotal", "Subtotal"],
        ["amountDue", "Amount due"],
        ["totalDue", "Total due"],
        ["totalPaid", "Total paid"],
        ["paidStamp", "Paid stamp"],
      ],
    ],
    [
      "Notes & pages",
      [
        ["paymentInstructions", "Payment instructions"],
        ["terms", "Terms & conditions"],
        ["continued", "Continued (on extra PDF pages)"],
      ],
    ],
  ];

  function wordingDefault(key) {
    return key === "currency" ? Store.DEFAULT_CURRENCY : Store.DEFAULT_LABELS[key];
  }

  function buildWording() {
    const host = $("#wordingFields");
    host.innerHTML = "";
    WORDING_GROUPS.forEach(([title, fields]) => {
      const group = document.createElement("div");
      group.className = "wording__group";
      const heading = document.createElement("div");
      heading.className = "wording__group-title";
      heading.textContent = title;
      group.appendChild(heading);

      const grid = document.createElement("div");
      grid.className = "grid grid--3";
      fields.forEach(([key, text]) => {
        const field = document.createElement("div");
        field.className = "field";
        const label = document.createElement("label");
        label.htmlFor = "word-" + key;
        label.textContent = text;
        const input = document.createElement("input");
        input.type = "text";
        input.id = "word-" + key;
        input.dataset.word = key;
        input.placeholder = wordingDefault(key);
        input.autocomplete = "off";
        field.appendChild(label);
        field.appendChild(input);
        grid.appendChild(field);
      });
      group.appendChild(grid);
      host.appendChild(group);
    });
  }

  function fillWording() {
    $$("[data-word]").forEach((input) => {
      const key = input.dataset.word;
      input.value = key === "currency" ? state.currency || "" : (state.labels || {})[key] || "";
    });
  }

  function saveWordingAsDefault() {
    const labels = {};
    Object.keys(Store.DEFAULT_LABELS).forEach((key) => {
      const value = String((state.labels || {})[key] || "").trim();
      if (value) labels[key] = value;
    });
    const currency = String(state.currency || "").trim() || Store.DEFAULT_CURRENCY;
    if (!Store.saveBusiness({ labels: labels, currency: currency })) {
      toast("Could not save — this device's storage is full.", "error");
      return;
    }
    business = Store.getBusiness();
    toast("Wording saved as your default");
  }

  function restoreWording() {
    state.labels = Object.assign({}, Store.DEFAULT_LABELS);
    state.currency = Store.DEFAULT_CURRENCY;
    fillWording();
    renderItems();
    markDirty();
    refresh();
    toast("Original wording restored on this invoice", "info");
  }

  /* --- Validation --------------------------------------------------------- */

  function setFieldError(id, message) {
    const input = $("#" + id);
    if (!input) return;
    const field = input.closest(".field");
    if (!field) return;

    let error = field.querySelector(".field__error");
    if (message) {
      if (!error) {
        error = document.createElement("div");
        error.className = "field__error";
        field.appendChild(error);
      }
      error.innerHTML = icon("alert") + "<span></span>";
      error.querySelector("span").textContent = message;
      field.classList.add("field--invalid");
      input.setAttribute("aria-invalid", "true");
    } else {
      field.classList.remove("field--invalid");
      input.removeAttribute("aria-invalid");
    }
  }

  function clearErrors() {
    $$(".field--invalid").forEach((field) => field.classList.remove("field--invalid"));
    $$("[aria-invalid]").forEach((input) => input.removeAttribute("aria-invalid"));
  }

  /**
   * @returns {boolean} true when the invoice is ready to export.
   * Errors land next to the offending field, and focus moves to the first one.
   */
  function validate() {
    clearErrors();
    const problems = [];

    if (!state.number.trim()) problems.push(["invoiceNumber", "Give the invoice a number."]);
    if (!state.issueDate) problems.push(["issueDate", "Pick an issue date."]);
    if (!state.dueDate) problems.push(["dueDate", "Pick a due date."]);
    if (
      state.issueDate &&
      state.dueDate &&
      Util.parseISODate(state.dueDate) < Util.parseISODate(state.issueDate)
    ) {
      problems.push(["dueDate", "The due date falls before the issue date."]);
    }
    if (!state.client.name.trim()) problems.push(["clientName", "Who is this invoice for?"]);

    const billable = Util.billableItems(state.items);
    if (billable.length === 0) {
      problems.push([null, "Add at least one line item with a description."]);
    }

    problems.forEach(([id, message]) => {
      if (id) setFieldError(id, message);
    });

    if (problems.length) {
      const first = problems.find(([id]) => id);
      if (first) {
        const input = $("#" + first[0]);
        input.focus();
        input.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      toast(problems[0][1], "error");
      return false;
    }
    return true;
  }

  /* --- Draft persistence --------------------------------------------------- */

  const queueDraftSave = Util.debounce(() => {
    Store.saveDraft(state);
  }, 500);

  function markDirty() {
    if (!dirty) {
      dirty = true;
      renderMeta();
    }
  }

  /* --- Actions ------------------------------------------------------------- */

  function saveInvoice(options) {
    const silent = options && options.silent;
    if (!silent && !validate()) return false;

    const wasNew = !state.id;
    const record = Store.saveInvoice(state);
    state.id = record.id;

    if (wasNew) Store.consumeNumber(state.number);
    Store.rememberClient(state.client);
    Store.clearDraft();

    dirty = false;
    renderMeta();
    if (!silent) toast("Invoice " + state.number + " saved");
    if (typeof Panels !== "undefined") Panels.refreshHistory();
    return true;
  }

  function downloadPdf() {
    if (!validate()) return;
    try {
      Pdf.save(state, business);
      toast("PDF downloaded");
      saveInvoice({ silent: true });
    } catch (error) {
      console.error("PDF export failed:", error);
      toast(error.message || "Could not build the PDF.", "error");
    }
  }

  function printInvoice() {
    if (!validate()) return;
    // Print CSS shows only the paper, so make sure it is rendered and unscaled.
    document.body.dataset.view = "preview";
    renderPreview();
    setTimeout(() => window.print(), 120);
  }

  function newInvoice(confirmFirst) {
    if (confirmFirst !== false && dirty && !state.id) {
      if (!confirm("Start a new invoice? The current one has not been saved.")) return;
    }
    state = blankInvoice();
    dirty = false;
    clearErrors();
    Store.clearDraft();
    fillForm();
    toast("New invoice " + state.number, "info");
    $("#clientName").focus();
  }

  function loadInvoice(id) {
    const record = Store.getInvoice(id);
    if (!record) {
      toast("That invoice is no longer stored.", "error");
      return;
    }
    state = JSON.parse(JSON.stringify(record));
    state.items = (state.items || []).map((item) =>
      Object.assign(blankItem(), item, { id: item.id || Util.uid("item") })
    );
    if (state.items.length === 0) state.items = [blankItem()];
    state.client = Object.assign({ name: "", company: "", email: "", phone: "", address: "" }, state.client);
    withWording(state);
    dirty = false;
    clearErrors();
    fillForm();
    toast("Opened " + state.number, "info");
  }

  /** Copy an existing invoice into a fresh, unsaved one. */
  function duplicateInvoice(id) {
    const record = Store.getInvoice(id);
    if (!record) return;

    const copy = JSON.parse(JSON.stringify(record));
    copy.id = null;
    copy.number = Store.peekNumber();
    copy.status = "draft";
    copy.issueDate = Util.today();
    copy.dueDate = Util.addDays(copy.issueDate, Util.toNumber(business.defaultDueDays, 30));
    copy.items = (copy.items || []).map((item) =>
      Object.assign(blankItem(), item, { id: Util.uid("item") })
    );
    if (copy.items.length === 0) copy.items = [blankItem()];

    state = withWording(copy);
    dirty = true;
    clearErrors();
    fillForm();
    toast("Duplicated as " + state.number, "info");
  }

  function applyClient(client) {
    state.client = {
      name: client.name || "",
      company: client.company || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
    };
    $("#clientName").value = state.client.name;
    $("#clientCompany").value = state.client.company;
    $("#clientEmail").value = state.client.email;
    $("#clientPhone").value = state.client.phone;
    $("#clientAddress").value = state.client.address;
    markDirty();
    refresh();
  }

  /** Re-read the business profile after Settings changes. */
  function reloadBusiness() {
    business = Store.getBusiness();
    $("#brandName").textContent = business.name || "Proton Billing";
    $("#brandSub").textContent = business.tagline || "";
    const mark = $("#brandMark");
    mark.src = business.logo || DEFAULT_LOGO_DATA_URL;
    mark.alt = (business.name || "Business") + " logo";
    document.title = (business.name || "Proton") + " — Billing";
    renderPreview();
  }

  /* --- Theme --------------------------------------------------------------- */

  function applyTheme(theme) {
    const resolved =
      theme ||
      Store.getTheme() ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = resolved;
    const toggle = $("#themeToggle");
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(resolved === "dark"));
      toggle.title = resolved === "dark" ? "Switch to light" : "Switch to dark";
      toggle.innerHTML =
        resolved === "dark"
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';
    }
    return resolved;
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    Store.saveTheme(next);
    applyTheme(next);
  }

  /* --- Client autocomplete -------------------------------------------------- */

  function setupClientCombo() {
    const input = $("#clientName");
    const list = $("#clientSuggestions");
    let matches = [];
    let active = -1;

    function close() {
      list.hidden = true;
      active = -1;
      input.setAttribute("aria-expanded", "false");
    }

    function paint() {
      const query = input.value.trim().toLowerCase();
      const clients = Store.getClients();
      matches = query
        ? clients.filter(
            (client) =>
              (client.name || "").toLowerCase().includes(query) ||
              (client.company || "").toLowerCase().includes(query)
          )
        : clients;
      matches = matches.slice(0, 6);

      if (matches.length === 0) {
        close();
        return;
      }

      list.innerHTML = "";
      matches.forEach((client, index) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "combo__opt";
        option.dataset.index = index;
        const name = document.createElement("span");
        name.textContent = client.name;
        option.appendChild(name);
        if (client.company || client.email) {
          const sub = document.createElement("small");
          sub.textContent = [client.company, client.email].filter(Boolean).join(" · ");
          option.appendChild(sub);
        }
        option.addEventListener("mousedown", (event) => {
          event.preventDefault();
          applyClient(client);
          close();
        });
        list.appendChild(option);
      });
      active = -1;
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    function highlight(next) {
      const options = $$(".combo__opt", list);
      if (options.length === 0) return;
      active = (next + options.length) % options.length;
      options.forEach((option, index) => option.classList.toggle("is-active", index === active));
      options[active].scrollIntoView({ block: "nearest" });
    }

    input.addEventListener("focus", paint);
    input.addEventListener("input", paint);
    input.addEventListener("blur", () => setTimeout(close, 120));
    input.addEventListener("keydown", (event) => {
      if (list.hidden) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        highlight(active + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        highlight(active - 1);
      } else if (event.key === "Enter" && active >= 0) {
        event.preventDefault();
        applyClient(matches[active]);
        close();
      } else if (event.key === "Escape") {
        close();
      }
    });
  }

  /* --- Wiring --------------------------------------------------------------- */

  function bindForm() {
    Object.keys(FIELD_MAP).forEach((id) => {
      const input = $("#" + id);
      if (!input) return;
      input.addEventListener("input", () => {
        FIELD_MAP[id](input.value);
        setFieldError(id, null);
        markDirty();
        refresh();
      });
    });

    $("#wordingFields").addEventListener("input", (event) => {
      const input = event.target.closest("[data-word]");
      if (!input) return;
      const key = input.dataset.word;
      if (key === "currency") state.currency = input.value;
      else state.labels = Object.assign({}, state.labels, { [key]: input.value });
      markDirty();
      refresh();
    });
    $("#wordingSaveDefault").addEventListener("click", saveWordingAsDefault);
    $("#wordingReset").addEventListener("click", restoreWording);

    $("#status").addEventListener("change", (event) => {
      state.status = event.target.value;
      markDirty();
      refresh();
    });

    const items = $("#items");
    items.addEventListener("input", (event) => {
      const input = event.target.closest("[data-k]");
      if (!input) return;
      const row = input.closest(".item");
      const item = state.items.find((entry) => entry.id === row.dataset.id);
      if (!item) return;

      const key = input.dataset.k;
      item[key] = key === "description" ? input.value : Util.toNumber(input.value, key === "quantity" ? 1 : 0);
      paintItemTotal(row, item);
      markDirty();
      refresh();
    });

    items.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove]");
      if (!button) return;
      removeItem(button.closest(".item").dataset.id);
      markDirty();
    });

    // Enter in the last description adds the next line — fast keyboard entry.
    items.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const input = event.target.closest('[data-k="description"]');
      if (!input) return;
      event.preventDefault();
      const rows = $$(".item");
      const isLast = rows[rows.length - 1] === input.closest(".item");
      if (isLast) addItem();
      else rows[rows.indexOf(input.closest(".item")) + 1].querySelector('[data-k="description"]').focus();
    });

    $("#addItem").addEventListener("click", () => {
      addItem();
      markDirty();
    });
    $("#btnSave").addEventListener("click", () => saveInvoice());
    $("#btnPdf").addEventListener("click", downloadPdf);
    $("#btnPrint").addEventListener("click", printInvoice);
    $("#btnNew").addEventListener("click", () => newInvoice());
    $("#themeToggle").addEventListener("click", toggleTheme);

    $$(".viewswitch button").forEach((button) => {
      button.addEventListener("click", () => {
        document.body.dataset.view = button.dataset.view;
        $$(".viewswitch button").forEach((other) =>
          other.setAttribute("aria-pressed", String(other === button))
        );
        if (button.dataset.view === "preview") requestAnimationFrame(fitPaper);
      });
    });
  }

  function bindShortcuts() {
    document.addEventListener("keydown", (event) => {
      const mod = event.metaKey || event.ctrlKey;

      if (event.key === "Escape") {
        if (typeof Panels !== "undefined") Panels.closeAll();
        return;
      }
      if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveInvoice();
        return;
      }
      if (mod && event.key === "Enter") {
        event.preventDefault();
        downloadPdf();
        return;
      }
      // Alt combos stay clear of browser and OS bindings.
      if (event.altKey && !mod) {
        const key = event.key.toLowerCase();
        if (key === "a") {
          event.preventDefault();
          addItem();
          markDirty();
        } else if (key === "n") {
          event.preventDefault();
          newInvoice();
        } else if (key === "h" && typeof Panels !== "undefined") {
          event.preventDefault();
          Panels.openHistory();
        }
      }
    });
  }

  /* --- Boot ---------------------------------------------------------------- */

  function init() {
    applyTheme();
    business = Store.getBusiness();

    const draft = Store.getDraft();
    state = blankInvoice();

    if (draft && typeof draft === "object" && draft.items) {
      state = Object.assign(state, draft);
      state.client = Object.assign(
        { name: "", company: "", email: "", phone: "", address: "" },
        draft.client
      );
      state.items = (draft.items || []).map((item) =>
        Object.assign(blankItem(), item, { id: item.id || Util.uid("item") })
      );
      if (state.items.length === 0) state.items = [blankItem()];
      withWording(state);
      dirty = true;
    }

    buildWording();
    bindForm();
    bindShortcuts();
    setupClientCombo();
    reloadBusiness();
    fillForm();

    if (draft) toast("Picked up where you left off", "info");

    window.addEventListener("resize", Util.debounce(fitPaper, 120));
    window.addEventListener("beforeunload", (event) => {
      if (!dirty || state.id) return;
      event.preventDefault();
      event.returnValue = "";
    });

    // Web fonts change the paper's height once they land.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPaper);
  }

  return {
    init,
    icon,
    toast,
    getState,
    getBusiness,
    reloadBusiness,
    loadInvoice,
    duplicateInvoice,
    newInvoice,
    saveInvoice,
    applyClient,
    fitPaper,
    renderPreview,
  };
})();

document.addEventListener("DOMContentLoaded", App.init);
