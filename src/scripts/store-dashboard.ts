// Renders the /store/ dashboard in the browser, so every view reflects the latest store data.
import {
  LOW_STOCK,
  currency,
  formatMoney,
  getOverview,
  getSalesByProduct,
  listOrders,
  listProducts,
  markShipped,
  resetDemo,
  setStock,
  updateProduct,
  type DailySales,
  type Order,
  type ProductStatus,
} from "../lib/store-demo/store";

type Child = Node | string | null | undefined | false;

function h(tag: string, attrs: Record<string, string | boolean | undefined> = {}, ...children: Child[]) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === true) node.setAttribute(key, "");
    else if (typeof value === "string") node.setAttribute(key, value);
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

const root = document.querySelector<HTMLElement>(".store")!;
const viewEl = root.querySelector<HTMLElement>("[data-view]")!;
const toastEl = root.querySelector<HTMLElement>("[data-toast]")!;
const posts: { title: string; url: string; products: string[] }[] = JSON.parse(root.dataset.posts ?? "[]");

const money = (n: number) => formatMoney(n);
const roundMoney = (n: number) => formatMoney(n, { maximumFractionDigits: 0 });
const whole = new Intl.NumberFormat("en");
const shortDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
const orderTime = (iso: string) =>
  new Date(iso).toLocaleString("en-NZ", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const STATUS_LABELS: Record<ProductStatus, string> = { active: "On sale", draft: "Hidden" };

let toastTimer: number | undefined;
function toast(message: string, error = false) {
  toastEl.textContent = message;
  toastEl.toggleAttribute("data-error", error);
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toastEl.hidden = true), 2600);
}

async function save(target: HTMLElement, action: () => Promise<void>, message: string) {
  target.classList.add("saving");
  target.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input, select, button").forEach((c) => (c.disabled = true));
  try {
    await action();
    toast(message);
  } catch (error) {
    toast(error instanceof Error ? error.message : "That change didn't save", true);
  }
  await render();
}

function card(title: string, unit?: string, ...children: Child[]) {
  return h("section", { class: "card" }, h("h2", {}, title, unit && " ", unit && h("span", { class: "unit" }, unit)), ...children);
}

function tile(label: string, value: string, sub?: Child) {
  return h("div", { class: "card" }, h("p", { class: "tile-label" }, label), h("p", { class: "tile-value" }, value), sub && h("p", { class: "tile-sub" }, sub));
}

function barList(items: { name: Child; value: number; label: string }[]) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return h(
    "ol",
    {},
    ...items.map((item) => {
      const bar = h("div", { class: "bar" });
      bar.style.width = `${(item.value / max) * 100}%`;
      return h(
        "li",
        {},
        h("div", { class: "bar-row" }, h("span", { class: "bar-name" }, item.name), h("span", { class: "num" }, item.label)),
        h("div", { class: "bar-track" }, bar),
      );
    }),
  );
}

function trendChart(points: DailySales[]) {
  const W = 800, H = 240, padL = 56, padR = 12, padT = 12, padB = 28;
  const max = Math.max(1, ...points.map((p) => p.sales));
  const step = 10 ** Math.floor(Math.log10(max / 3));
  const tick = [1, 2, 5, 10].map((m) => m * step).find((t) => max / t <= 4) ?? step * 10;
  const yMax = Math.ceil(max / tick) * tick;
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, points.length - 1);
  const y = (v: number) => padT + (1 - v / yMax) * (H - padT - padB);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.sales).toFixed(1)}`).join("");
  const area = `${line}L${x(points.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("tabindex", "0");
  svg.setAttribute("aria-label", `Sales per day, peaking at ${roundMoney(max)}. Use the arrow keys to read each day.`);
  const make = (tag: string, attrs: Record<string, string | number>, text?: string) => {
    const node = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
    if (text) node.textContent = text;
    svg.append(node);
    return node;
  };
  for (let t = 0; t <= yMax; t += tick) {
    make("line", { x1: padL, x2: W - padR, y1: y(t), y2: y(t), class: "grid-line" });
    make("text", { x: padL - 8, y: y(t), dy: "0.32em", "text-anchor": "end", class: "axis-label" }, roundMoney(t));
  }
  const labelIdx = [0, Math.floor((points.length - 1) / 2), points.length - 1];
  labelIdx.forEach((i, n) =>
    make("text", { x: x(i), y: H - 8, "text-anchor": ["start", "middle", "end"][n], class: "axis-label" }, i === points.length - 1 ? "Today" : shortDate(points[i].date)),
  );
  make("path", { d: area, class: "series-area" });
  make("path", { d: line, class: "series-line" });
  const cross = make("line", { class: "crosshair", y1: padT, y2: y(0), visibility: "hidden" });
  const dot = make("circle", { class: "crosshair-dot", r: 4, visibility: "hidden" });
  make("rect", { x: padL, y: padT, width: W - padL - padR, height: H - padT - padB, fill: "transparent" });

  const tip = h("div", { class: "trend-tip", hidden: true });
  const wrap = h("div", { class: "trend" }, svg, tip);
  let index = -1;
  const show = (i: number) => {
    index = Math.max(0, Math.min(points.length - 1, i));
    const p = points[index];
    for (const [node, attrs] of [
      [cross, { x1: x(index), x2: x(index) }],
      [dot, { cx: x(index), cy: y(p.sales) }],
    ] as const) {
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
      node.setAttribute("visibility", "visible");
    }
    tip.replaceChildren(h("strong", {}, money(p.sales)), ` · ${p.orders} orders · ${index === points.length - 1 ? "today" : shortDate(p.date)}`);
    tip.style.left = `${(x(index) / W) * 100}%`;
    tip.hidden = false;
  };
  const hide = () => {
    cross.setAttribute("visibility", "hidden");
    dot.setAttribute("visibility", "hidden");
    tip.hidden = true;
  };
  svg.addEventListener("pointermove", (event) => {
    const box = svg.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * W;
    show(Math.round(((px - padL) / (W - padL - padR)) * (points.length - 1)));
  });
  svg.addEventListener("pointerleave", hide);
  svg.addEventListener("blur", hide);
  svg.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") show(index + 1);
    else if (event.key === "ArrowLeft") show(index < 0 ? points.length - 1 : index - 1);
  });
  return wrap;
}

function productLink(handle: string, title: string) {
  return h("a", { href: `/products/${handle}/` }, title);
}

async function renderToday() {
  const o = await getOverview();
  const lowList = o.lowStock.length
    ? h(
        "ul",
        { class: "plain" },
        ...o.lowStock.map((p) => {
          const row = h(
            "li",
            { class: "low-row" },
            p.image && h("img", { class: "thumb", src: `${p.image}&width=80`, alt: "", loading: "lazy" }),
            h("span", { class: "grow" }, productLink(p.handle, p.title), h("span", { class: "small" }, `${p.stock} left`)),
          );
          const restock = h("button", { type: "button", class: "store-button" }, "Add 20");
          restock.addEventListener("click", () => save(row, () => setStock(p.handle, p.stock + 20), `${p.title}: stock set to ${p.stock + 20}`));
          row.append(restock);
          return row;
        }),
      )
    : h("p", { class: "store-muted" }, "Nothing on sale is running low.");

  return [
    h(
      "section",
      { class: "tiles", "aria-label": "Totals" },
      tile("Sales today", roundMoney(o.today.sales), `${o.today.orders} orders so far`),
      tile("Last 7 days", roundMoney(o.week.sales), `${o.week.orders} orders`),
      tile("To ship", whole.format(o.toShip), h("a", { href: "#orders" }, "See orders")),
      tile("Running low", whole.format(o.lowStock.length), `${LOW_STOCK} or fewer left`),
    ),
    card("Sales per day", "last 28 days", trendChart(o.daily)),
    h(
      "div",
      { class: "pair" },
      card(
        "Best sellers",
        "last 7 days",
        barList(o.bestSellers.slice(0, 6).map((p) => ({ name: productLink(p.handle, p.title), value: p.revenue, label: `${roundMoney(p.revenue)} · ${p.units} sold` }))),
      ),
      card("Running low", undefined, lowList),
    ),
  ];
}

async function renderProducts() {
  const [products, sales] = await Promise.all([listProducts(), getSalesByProduct()]);
  const sold = new Map(sales.map((s) => [s.handle, s.units]));
  const rows = products.map((p) => {
    const row = h("tr");
    const status = h("select", { "aria-label": `${p.title} status` }) as HTMLSelectElement;
    for (const value of ["active", "draft"] as ProductStatus[]) {
      status.append(h("option", { value, selected: value === p.status }, STATUS_LABELS[value]));
    }
    status.addEventListener("change", () => {
      const next = status.value as ProductStatus;
      save(row, () => updateProduct(p.handle, { status: next }), `${p.title} is now ${STATUS_LABELS[next].toLowerCase()}`);
    });
    const price = h("input", { type: "number", min: "0.01", step: "0.01", value: p.price.toFixed(2), "aria-label": `${p.title} price` }) as HTMLInputElement;
    price.addEventListener("change", () => {
      const next = Number(price.value);
      save(row, () => updateProduct(p.handle, { price: next }), `${p.title}: price set to ${money(next)}`);
    });
    const stock = h("input", { type: "number", min: "0", step: "1", value: String(p.stock), "aria-label": `${p.title} stock` }) as HTMLInputElement;
    stock.addEventListener("change", () => {
      const next = Number(stock.value);
      save(row, () => setStock(p.handle, next), `${p.title}: stock set to ${next}`);
    });
    const flag =
      p.status === "draft"
        ? h("span", { class: "chip muted" }, "Hidden")
        : p.stock <= LOW_STOCK && h("span", { class: "chip warn" }, "Running low");
    row.append(
      h(
        "td",
        {},
        h(
          "div",
          { class: "product-cell" },
          p.image && h("img", { class: "thumb", src: `${p.image}&width=80`, alt: "", loading: "lazy" }),
          h("span", {}, p.title, " ", flag, h("span", { class: "small" }, h("a", { href: `/products/${p.handle}/` }, "Edit page content"))),
        ),
      ),
      h("td", {}, status),
      h("td", {}, price),
      h("td", {}, stock),
      h("td", { class: "num" }, whole.format(sold.get(p.handle) ?? 0)),
    );
    return row;
  });
  return [
    h(
      "section",
      { class: "card" },
      h("div", { class: "card-head" }, h("h2", {}, "Products"), h("span", { class: "unit" }, "Changes save to the store as you make them. Shoppers see them within a minute.")),
      h(
        "div",
        { class: "table-scroll" },
        h(
          "table",
          {},
          h("thead", {}, h("tr", {}, h("th", {}, "Product"), h("th", {}, "Status"), h("th", {}, `Price (${currency})`), h("th", {}, "In stock"), h("th", { class: "num" }, "Sold, 28 days"))),
          h("tbody", {}, ...rows),
        ),
      ),
    ),
  ];
}

let orderFilter: "to-ship" | "all" = "to-ship";

function itemsText(order: Order) {
  return order.items.map((i) => `${i.quantity} × ${i.title}`).join(", ");
}

async function renderOrders() {
  const orders = await listOrders();
  const toShip = orders.filter((o) => !o.shipped);
  const shown = orderFilter === "to-ship" ? toShip : orders.slice(0, 50);
  const filter = (value: typeof orderFilter, label: string) => {
    const button = h("button", { type: "button", class: "store-button", "aria-pressed": String(orderFilter === value) }, label);
    button.addEventListener("click", () => {
      orderFilter = value;
      render();
    });
    return button;
  };
  const rows = shown.map((o) => {
    const row = h("tr");
    let status: Node = h("span", { class: "chip good" }, "Shipped");
    if (!o.shipped) {
      status = h("button", { type: "button", class: "store-button", "data-primary": true }, "Mark shipped");
      status.addEventListener("click", () => save(row, () => markShipped(o.id), `Order ${o.id} marked as shipped`));
    }
    row.append(
      h("td", {}, h("strong", {}, o.id), h("span", { class: "small" }, orderTime(o.createdAt))),
      h("td", {}, o.customer, h("span", { class: "small" }, o.city)),
      h("td", {}, itemsText(o)),
      h("td", { class: "num" }, money(o.total)),
      h("td", {}, status),
    );
    return row;
  });
  return [
    h(
      "section",
      { class: "card" },
      h("div", { class: "card-head" }, h("h2", {}, "Orders"), h("div", { class: "filters" }, filter("to-ship", `To ship (${toShip.length})`), filter("all", "Recent"))),
      shown.length
        ? h(
            "div",
            { class: "table-scroll" },
            h(
              "table",
              {},
              h("thead", {}, h("tr", {}, h("th", {}, "Order"), h("th", {}, "Customer"), h("th", {}, "Items"), h("th", { class: "num" }, "Total"), h("th", {}, "Status"))),
              h("tbody", {}, ...rows),
            ),
          )
        : h("p", { class: "store-muted" }, "Everything has shipped."),
    ),
  ];
}

async function renderContent() {
  const sales = new Map((await getSalesByProduct()).map((s) => [s.handle, s]));
  const rows = posts
    .map((post) => {
      const items = post.products.map((handle) => sales.get(handle)).filter((s) => s !== undefined);
      return { post, items, revenue: items.reduce((sum, i) => sum + i.revenue, 0) };
    })
    .sort((a, b) => b.revenue - a.revenue);
  return [
    h("p", { class: "store-muted" }, "Sales over the last 28 days of the products each Journal post links to. A post's products can sell without anyone reading it, so read this as which topics line up with what sells."),
    rows.length
      ? h(
          "div",
          { class: "posts" },
          ...rows.map(({ post, items, revenue }) =>
            h(
              "section",
              { class: "card" },
              h("div", { class: "card-head" }, h("h2", {}, h("a", { href: post.url }, post.title)), h("span", { class: "post-total" }, roundMoney(revenue))),
              barList(items.map((i) => ({ name: productLink(i.handle, i.title), value: i.revenue, label: `${roundMoney(i.revenue)} · ${i.units} sold` }))),
            ),
          ),
        )
      : h("p", { class: "store-muted" }, "No Journal posts link to products yet."),
  ];
}

const VIEWS = { today: renderToday, products: renderProducts, orders: renderOrders, content: renderContent };
type View = keyof typeof VIEWS;

function currentView(): View {
  const id = location.hash.slice(1);
  return id in VIEWS ? (id as View) : "today";
}

async function render() {
  const view = currentView();
  root.querySelectorAll<HTMLAnchorElement>("[data-tab]").forEach((tab) => {
    if (tab.dataset.tab === view) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  try {
    const nodes = await VIEWS[view]();
    if (currentView() === view) viewEl.replaceChildren(...nodes);
  } catch (error) {
    console.error("[store]", error);
    viewEl.replaceChildren(h("p", { class: "store-muted" }, "The store data didn't load. Reload to try again."));
  }
}

root.querySelector("[data-reset]")?.addEventListener("click", () => {
  resetDemo();
  toast("Demo data reset");
  render();
});
window.addEventListener("hashchange", render);
render();
