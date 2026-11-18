// Store pop-up for product pages, loaded only inside CloudCannon's Visual Editor on builds with the
// store demo. Shows and edits the product's price, stock and status beside its page content.
import {
  LOW_STOCK,
  formatMoney,
  getProductStats,
  setStock,
  updateProduct,
  type ProductStats,
  type ProductStatus,
} from "../lib/store-demo/store";

const STORAGE_KEY = "cc-store-panel-open";

function readOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeOpen(open: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  } catch {}
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const STYLES = `
  :host {
    all: initial;
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 999990;
    font: 14px/1.4 system-ui, -apple-system, sans-serif;
    color: #111827;
    --series-1: #2a78d6;
  }
  button, input, select { font: inherit; }
  button { cursor: pointer; }
  .pill {
    display: flex; align-items: center; gap: 8px;
    border: 0; border-radius: 999px; padding: 8px 14px;
    background: #2f4a3a; color: #fff;
    box-shadow: 0 4px 14px rgb(0 0 0 / 0.2);
    font-variant-numeric: tabular-nums;
  }
  .pill svg { width: 16px; height: 16px; }
  .card {
    width: min(320px, calc(100vw - 32px));
    background: #fff; border-radius: 12px; padding: 14px;
    box-shadow: 0 8px 30px rgb(0 0 0 / 0.22);
  }
  .head { display: flex; justify-content: space-between; align-items: start; gap: 8px; }
  .title { font-weight: 600; }
  .sub { color: #6b7280; font-size: 12px; }
  .close { border: 0; background: none; color: #6b7280; font-size: 18px; line-height: 1; padding: 2px 4px; }
  .badge { display: inline-block; margin-left: 6px; border-radius: 999px; padding: 0 6px; font-size: 11px; background: #fef3c7; color: #78350f; vertical-align: middle; }
  form { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0 4px; }
  label { display: grid; gap: 2px; font-size: 12px; color: #6b7280; }
  label.wide { grid-column: 1 / -1; }
  input, select { border: 1px solid #d1d5db; border-radius: 6px; padding: 5px 7px; color: #111827; background: #fff; font-variant-numeric: tabular-nums; min-width: 0; }
  .save { grid-column: 1 / -1; border: 0; border-radius: 8px; padding: 7px; background: #2f4a3a; color: #fff; font-weight: 600; }
  .save:disabled { opacity: 0.6; cursor: progress; }
  .status { font-size: 12px; min-height: 1.4em; color: #374151; }
  .status.error { color: #b42318; }
  .warn { color: #92400e; font-size: 12px; margin: 4px 0 0; }
  .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 10px 0; }
  .tile { border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 8px; }
  .tile-label { font-size: 12px; color: #6b7280; }
  .tile-value { font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .section { font-size: 12px; font-weight: 600; color: #374151; margin: 10px 0 4px; }
  .spark svg { display: block; width: 100%; height: 48px; }
  .spark-line { fill: none; stroke: var(--series-1); stroke-width: 2; stroke-linejoin: round; }
  .spark-area { fill: var(--series-1); opacity: 0.1; }
  .foot { margin-top: 10px; display: flex; justify-content: space-between; gap: 8px; font-size: 11px; color: #6b7280; }
  .foot a { color: #034ad8; }
`;

const BAG_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';

class StorePanel extends HTMLElement {
  #root = this.attachShadow({ mode: "open" });
  #open = readOpen();
  #stats?: ProductStats;
  #message = "";
  #error = false;

  handle = "";

  async load() {
    this.#stats = await getProductStats(this.handle);
    this.render();
  }

  toggle(open: boolean) {
    this.#open = open;
    writeOpen(open);
    this.render();
  }

  render() {
    if (!this.#stats) return;
    const style = el("style");
    style.textContent = STYLES;
    this.#root.replaceChildren(style, this.#open ? this.card(this.#stats) : this.pill(this.#stats));
  }

  pill({ product }: ProductStats) {
    const button = el("button", "pill");
    button.innerHTML = BAG_ICON;
    button.append(document.createTextNode(`${formatMoney(product.price)} · ${product.stock} in stock`));
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Show store details for this product");
    button.addEventListener("click", () => this.toggle(true));
    return button;
  }

  card(stats: ProductStats) {
    const { product } = stats;
    const card = el("section", "card");
    card.setAttribute("aria-label", "Store details");

    const head = el("div", "head");
    const titleWrap = el("div");
    const title = el("div", "title", "In the store");
    title.append(el("span", "badge", "Demo data"));
    titleWrap.append(title, el("div", "sub", product.title));
    const close = el("button", "close", "×");
    close.setAttribute("aria-label", "Collapse store details");
    close.addEventListener("click", () => this.toggle(false));
    head.append(titleWrap, close);
    card.append(head);

    const form = el("form");
    const field = (label: string, input: HTMLElement, wide = false) => {
      const wrap = el("label", wide ? "wide" : undefined, label);
      wrap.append(input);
      form.append(wrap);
    };
    const price = el("input");
    Object.assign(price, { type: "number", min: "0.01", step: "0.01", value: product.price.toFixed(2) });
    const stock = el("input");
    Object.assign(stock, { type: "number", min: "0", step: "1", value: String(product.stock) });
    const status = el("select");
    for (const [value, label] of [["active", "On sale"], ["draft", "Hidden from shoppers"]]) {
      const option = el("option", undefined, label);
      option.value = value;
      option.selected = value === product.status;
      status.append(option);
    }
    field(`Price (${stats.currency})`, price);
    field("In stock", stock);
    field("Status", status, true);
    const save = el("button", "save", "Save to store");
    save.type = "submit";
    form.append(save);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      save.disabled = true;
      try {
        await updateProduct(product.handle, { price: Number(price.value), status: status.value as ProductStatus });
        await setStock(product.handle, Number(stock.value));
        this.#message = "Saved. Shoppers see it within a minute.";
        this.#error = false;
      } catch (error) {
        this.#message = error instanceof Error ? error.message : "That change didn't save";
        this.#error = true;
      }
      await this.load();
    });
    card.append(form, el("div", this.#error ? "status error" : "status", this.#message));
    if (product.status === "active" && product.stock <= LOW_STOCK) {
      card.append(el("p", "warn", `Running low: ${product.stock} left at this week's pace of ${stats.week.units} sold.`));
    }

    const tiles = el("div", "tiles");
    for (const [label, value] of [
      ["Sold, 7 days", String(stats.week.units)],
      ["Sales, 7 days", formatMoney(stats.week.revenue, { maximumFractionDigits: 0 })],
    ]) {
      const tile = el("div", "tile");
      tile.append(el("div", "tile-label", label), el("div", "tile-value", value));
      tiles.append(tile);
    }
    card.append(tiles, el("div", "section", "Units sold per day, last 28 days"), this.sparkline(stats));

    const foot = el("div", "foot");
    foot.append(el("span", undefined, "Sample data, saved in this browser"));
    const link = el("a", undefined, "Store dashboard");
    link.href = "/store/#products";
    foot.append(link);
    card.append(foot);
    return card;
  }

  sparkline({ daily }: ProductStats) {
    const W = 290, H = 48, pad = 4;
    const max = Math.max(1, ...daily.map((d) => d.units));
    const pts = daily.map((d, i) => [pad + (i * (W - pad * 2)) / Math.max(1, daily.length - 1), pad + (1 - d.units / max) * (H - pad * 2)]);
    const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
    const area = `${line}L${pts[pts.length - 1][0]},${H - pad}L${pts[0][0]},${H - pad}Z`;
    const wrap = el("div", "spark");
    wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Units sold per day, peaking at ${max}"><path class="spark-area" d="${area}"/><path class="spark-line" d="${line}" vector-effect="non-scaling-stroke"/></svg>`;
    return wrap;
  }
}

function mount() {
  const handle = location.pathname.match(/^\/products\/([^/]+)\/?$/)?.[1];
  if (!handle || document.querySelector("cc-store-panel")) return;
  if (!customElements.get("cc-store-panel")) customElements.define("cc-store-panel", StorePanel);
  const panel = document.createElement("cc-store-panel") as StorePanel;
  panel.handle = decodeURIComponent(handle);
  document.body.append(panel);
  panel.load();
}

mount();

export {};
