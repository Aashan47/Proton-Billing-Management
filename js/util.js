/* Shared helpers: formatting, escaping, DOM, money maths.
   Classic script (no modules) so the app still runs from file://. */

const Util = (() => {
  const CURRENCY = "PKR";

  /** Escape before interpolating anything user-typed into innerHTML. */
  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toNumber(value, fallback = 0) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }

  /** 1234567.5 -> "1,234,567.50" */
  function formatAmount(value) {
    return toNumber(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /** 1234567.5 -> "PKR 1,234,567.50" */
  function money(value, currency) {
    return (currency || CURRENCY) + " " + formatAmount(value);
  }

  /** "2026-07-29" -> "29 July 2026". Parsed as local time, not UTC. */
  function formatDate(iso) {
    const date = parseISODate(iso);
    if (!date) return "—";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  /** "2026-07-29" -> "29 Jul 2026" */
  function formatDateShort(iso) {
    const date = parseISODate(iso);
    if (!date) return "—";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  /** new Date("2026-07-29") is UTC midnight, which shifts a day west of GMT. */
  function parseISODate(iso) {
    if (!iso) return null;
    const parts = String(iso).split("-");
    if (parts.length !== 3) return null;
    const date = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function toISODate(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
      date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate())
    );
  }

  function today() {
    return toISODate(new Date());
  }

  function addDays(iso, days) {
    const date = parseISODate(iso) || new Date();
    date.setDate(date.getDate() + days);
    return toISODate(date);
  }

  /** Days until the due date; negative once overdue. */
  function daysUntil(iso) {
    const date = parseISODate(iso);
    if (!date) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((date - now) / 86400000);
  }

  function uid(prefix = "id") {
    return prefix + "-" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  }

  function debounce(fn, wait) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /** Per-item maths, shared by the editor, the document and the PDF. */
  function itemMath(item) {
    const price = toNumber(item.price);
    const quantity = toNumber(item.quantity, 1);
    const discountPct = Math.min(Math.max(toNumber(item.discount), 0), 100);
    const gross = price * quantity;
    const discount = gross * (discountPct / 100);
    return { price, quantity, discountPct, gross, discount, total: gross - discount };
  }

  function invoiceMath(items) {
    let subtotal = 0;
    let discount = 0;
    (items || []).forEach((item) => {
      const m = itemMath(item);
      subtotal += m.gross;
      discount += m.discount;
    });
    return { subtotal, discount, total: subtotal - discount };
  }

  /** Items that actually belong on the document. */
  function billableItems(items) {
    return (items || []).filter((item) => (item.description || "").trim() !== "");
  }

  /** Filename-safe slug, e.g. "Acme Films Ltd." -> "Acme-Films-Ltd" */
  function slug(value) {
    return (
      String(value || "")
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "Client"
    );
  }

  function $(selector, scope = document) {
    return scope.querySelector(selector);
  }

  function $$(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return {
    CURRENCY,
    escapeHtml,
    toNumber,
    formatAmount,
    money,
    formatDate,
    formatDateShort,
    parseISODate,
    toISODate,
    today,
    addDays,
    daysUntil,
    uid,
    debounce,
    itemMath,
    invoiceMath,
    billableItems,
    slug,
    $,
    $$,
    downloadBlob,
  };
})();
