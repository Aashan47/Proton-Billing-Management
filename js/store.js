/* localStorage persistence: business profile, saved invoices, clients, draft, theme.
   Every read is defensive — a corrupt or hand-edited key must not white-screen the app. */

const Store = (() => {
  const KEYS = {
    business: "proton.business.v1",
    invoices: "proton.invoices.v1",
    clients: "proton.clients.v1",
    draft: "proton.draft.v1",
    theme: "proton.theme.v1",
  };

  /* Every fixed word printed on the invoice. Each invoice carries its own copy
     (editable in the "Invoice wording" card); `business.labels` holds the
     user's saved defaults. A blank entry falls back to the text here. */
  const DEFAULT_LABELS = {
    title: "Invoice",
    billedTo: "Billed to",
    from: "From",
    issued: "Issued",
    due: "Due",
    amountDue: "Amount due",
    totalPaid: "Total paid",
    payableBy: "Payable by",
    paidStamp: "Paid in full",
    description: "Description",
    qty: "Qty",
    rate: "Rate",
    discount: "Discount",
    amount: "Amount",
    subtotal: "Subtotal",
    totalDue: "Total due",
    paymentInstructions: "Payment instructions",
    terms: "Terms & conditions",
    continued: "continued",
  };

  const DEFAULT_CURRENCY = "PKR";

  const DEFAULT_BUSINESS = {
    name: "Proton Studio",
    tagline: "Professional Film & Media Services",
    address: "1401 Bahria Orchard\nLahore, Punjab 54000\nPakistan",
    email: "info@protonstudio.com",
    phone: "+92 300 1234567",
    website: "",
    logo: "",
    numberPrefix: "INV-",
    nextNumber: 1,
    defaultDueDays: 30,
    defaultPaymentInstructions:
      "Bank transfer to Proton Studio.\nPlease quote the invoice number as the payment reference.",
    defaultTerms:
      "Payment is due within 30 days of the invoice date.\nLate payments may incur a surcharge.\nAll deliverables remain the property of Proton Studio until payment clears in full.",
    footerNote: "Thank you for choosing Proton Studio",
    currency: DEFAULT_CURRENCY,
    labels: {},
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (error) {
      console.warn("Could not read " + key + ":", error);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      // Most likely QuotaExceededError — a large logo plus a long invoice history.
      console.warn("Could not write " + key + ":", error);
      return false;
    }
  }

  /* --- Business profile -------------------------------------------------- */

  function getBusiness() {
    const saved = read(KEYS.business, {});
    return Object.assign({}, DEFAULT_BUSINESS, saved && typeof saved === "object" ? saved : {});
  }

  function saveBusiness(business) {
    return write(KEYS.business, Object.assign(getBusiness(), business));
  }

  /* --- Wording and currency ---------------------------------------------- */

  function firstText(values) {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
  }

  /** The labels to print: invoice override, then saved default, then built-in. */
  function labelsFor(invoice, business) {
    const own = (invoice && invoice.labels) || {};
    const saved = (business && business.labels) || {};
    const out = {};
    Object.keys(DEFAULT_LABELS).forEach((key) => {
      out[key] = firstText([own[key], saved[key], DEFAULT_LABELS[key]]);
    });
    return out;
  }

  function currencyFor(invoice, business) {
    return firstText([invoice && invoice.currency, business && business.currency, DEFAULT_CURRENCY]);
  }

  /* --- Invoice numbering ------------------------------------------------- */

  /** Peek at the next number without consuming it. */
  function peekNumber() {
    const business = getBusiness();
    const seq = Math.max(1, Util.toNumber(business.nextNumber, 1));
    return business.numberPrefix + String(seq).padStart(4, "0");
  }

  /** Advance the counter past `number` if it is the one we handed out. */
  function consumeNumber(number) {
    const business = getBusiness();
    if (number !== peekNumber()) return;
    saveBusiness({ nextNumber: Math.max(1, Util.toNumber(business.nextNumber, 1)) + 1 });
  }

  /* --- Invoices ---------------------------------------------------------- */

  function getInvoices() {
    const list = read(KEYS.invoices, []);
    return Array.isArray(list) ? list : [];
  }

  /** Insert or update by id; newest first. Returns the stored record. */
  function saveInvoice(invoice) {
    const list = getInvoices();
    const record = Object.assign({}, invoice, { updatedAt: new Date().toISOString() });
    if (!record.id) record.id = Util.uid("inv");
    if (!record.createdAt) record.createdAt = record.updatedAt;

    const index = list.findIndex((entry) => entry.id === record.id);
    if (index === -1) list.unshift(record);
    else list[index] = record;

    list.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    write(KEYS.invoices, list);
    return record;
  }

  function getInvoice(id) {
    return getInvoices().find((entry) => entry.id === id) || null;
  }

  function deleteInvoice(id) {
    write(
      KEYS.invoices,
      getInvoices().filter((entry) => entry.id !== id)
    );
  }

  /* --- Clients ----------------------------------------------------------- */

  function getClients() {
    const list = read(KEYS.clients, []);
    return Array.isArray(list) ? list : [];
  }

  /** Remember a client by name so it can autocomplete next time. */
  function rememberClient(client) {
    if (!client || !(client.name || "").trim()) return;
    const list = getClients();
    const key = client.name.trim().toLowerCase();
    const index = list.findIndex((entry) => (entry.name || "").trim().toLowerCase() === key);
    const record = {
      name: client.name.trim(),
      company: client.company || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      usedAt: new Date().toISOString(),
    };
    if (index === -1) list.push(record);
    else list[index] = record;

    list.sort((a, b) => String(b.usedAt || "").localeCompare(String(a.usedAt || "")));
    write(KEYS.clients, list.slice(0, 200));
  }

  function deleteClient(name) {
    const key = String(name || "").trim().toLowerCase();
    write(
      KEYS.clients,
      getClients().filter((entry) => (entry.name || "").trim().toLowerCase() !== key)
    );
  }

  /* --- Draft (work in progress) ------------------------------------------ */

  function getDraft() {
    return read(KEYS.draft, null);
  }

  function saveDraft(draft) {
    return write(KEYS.draft, draft);
  }

  function clearDraft() {
    localStorage.removeItem(KEYS.draft);
  }

  /* --- Theme ------------------------------------------------------------- */

  function getTheme() {
    return read(KEYS.theme, null);
  }

  function saveTheme(theme) {
    write(KEYS.theme, theme);
  }

  /* --- Backup ------------------------------------------------------------ */

  function exportAll() {
    return {
      format: "proton-billing-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      business: getBusiness(),
      invoices: getInvoices(),
      clients: getClients(),
    };
  }

  /**
   * Restore a backup. Merges rather than wipes: invoices and clients already
   * present are kept, so importing on a machine with data never loses work.
   */
  function importAll(payload) {
    if (!payload || payload.format !== "proton-billing-backup") {
      throw new Error("That file is not a Proton Billing backup.");
    }

    if (payload.business && typeof payload.business === "object") {
      saveBusiness(payload.business);
    }

    let invoicesAdded = 0;
    if (Array.isArray(payload.invoices)) {
      const existing = getInvoices();
      const seen = new Set(existing.map((entry) => entry.id));
      payload.invoices.forEach((invoice) => {
        if (!invoice || typeof invoice !== "object") return;
        if (!invoice.id) invoice.id = Util.uid("inv");
        if (seen.has(invoice.id)) return;
        seen.add(invoice.id);
        existing.push(invoice);
        invoicesAdded += 1;
      });
      existing.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      write(KEYS.invoices, existing);
    }

    let clientsAdded = 0;
    if (Array.isArray(payload.clients)) {
      const before = getClients().length;
      payload.clients.forEach((client) => rememberClient(client));
      clientsAdded = Math.max(0, getClients().length - before);
    }

    return { invoicesAdded, clientsAdded };
  }

  return {
    KEYS,
    DEFAULT_BUSINESS,
    DEFAULT_LABELS,
    DEFAULT_CURRENCY,
    labelsFor,
    currencyFor,
    getBusiness,
    saveBusiness,
    peekNumber,
    consumeNumber,
    getInvoices,
    getInvoice,
    saveInvoice,
    deleteInvoice,
    getClients,
    rememberClient,
    deleteClient,
    getDraft,
    saveDraft,
    clearDraft,
    getTheme,
    saveTheme,
    exportAll,
    importAll,
  };
})();
