// Sample store data for the dashboard demo. The catalog is the synced Shopify catalog; stock,
// orders and sales are generated. Edits live in this browser's localStorage only.
import catalog from '../../data/shopify/products.json';
import type { Order, ProductStatus, StoreProduct } from './types';

const STORAGE_KEY = 'cc-store-demo';
const DAYS = 28;
const UNSHIPPED_DAYS = 2;

interface Edits {
	products: Record<string, Partial<Pick<StoreProduct, 'price' | 'stock' | 'status'>>>;
	shipped: string[];
}

// Same sequence on every load, so the demo tells the same story.
function rng(seed: number) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const FIRST = ['Aroha', 'Ben', 'Chloe', 'Daniel', 'Ella', 'Finn', 'Grace', 'Hemi', 'Isla', 'Jack', 'Kiri', 'Liam', 'Mia', 'Noah', 'Olivia', 'Priya', 'Sam', 'Tama', 'Zoe'];
const LAST = ['B.', 'C.', 'H.', 'K.', 'M.', 'N.', 'P.', 'R.', 'S.', 'T.', 'W.'];
const CITIES = ['Auckland', 'Wellington', 'Christchurch', 'Dunedin', 'Hamilton', 'Nelson', 'Tauranga', 'Napier'];

export const currency = catalog[0]?.priceRange.minVariantPrice.currencyCode ?? 'NZD';

const base = (() => {
	const random = rng(20261118);
	const products = catalog.map((p) => ({
		handle: p.handle,
		title: p.title,
		image: p.featuredImage?.url ?? null,
		price: Number(p.priceRange.minVariantPrice.amount),
		stock: 8 + Math.floor(random() * 18),
		status: (p.availableForSale ? 'active' : 'draft') as ProductStatus,
		weight: 0.3 + random(),
	}));
	// The two best sellers are running low, so the demo has something to act on.
	[...products].sort((a, b) => b.weight - a.weight).slice(0, 2).forEach((p, i) => (p.stock = 3 + i));
	return products;
})();

function dayKey(daysAgo: number): string {
	const d = new Date();
	d.setDate(d.getDate() - daysAgo);
	return d.toLocaleDateString('en-CA');
}

const baseOrders: Order[] = (() => {
	const random = rng(7);
	const totalWeight = base.reduce((sum, p) => sum + p.weight, 0);
	const pick = () => {
		let r = random() * totalWeight;
		return base.find((p) => (r -= p.weight) <= 0) ?? base[0];
	};
	const orders: Order[] = [];
	for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo--) {
		const date = dayKey(daysAgo);
		const weekend = [0, 6].includes(new Date(`${date}T12:00:00`).getDay());
		const count = daysAgo === 0 ? 2 + Math.floor(random() * 3) : 5 + Math.floor(random() * 7) + (weekend ? 4 : 0);
		for (let n = 0; n < count; n++) {
			const lines = new Map<string, { handle: string; title: string; quantity: number; price: number }>();
			const lineCount = random() < 0.7 ? 1 : 2 + Math.floor(random() * 2);
			for (let l = 0; l < lineCount; l++) {
				const p = pick();
				const line = lines.get(p.handle) ?? { handle: p.handle, title: p.title, quantity: 0, price: p.price };
				line.quantity += random() < 0.85 ? 1 : 2;
				lines.set(p.handle, line);
			}
			const items = [...lines.values()];
			const hour = 7 + Math.floor(random() * 14);
			orders.push({
				id: '',
				createdAt: new Date(`${date}T${String(hour).padStart(2, '0')}:${String(Math.floor(random() * 60)).padStart(2, '0')}:00`).toISOString(),
				customer: `${FIRST[Math.floor(random() * FIRST.length)]} ${LAST[Math.floor(random() * LAST.length)]}`,
				city: CITIES[Math.floor(random() * CITIES.length)],
				items,
				total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
				shipped: daysAgo >= UNSHIPPED_DAYS,
			});
		}
	}
	orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	orders.forEach((o, i) => (o.id = `#${1001 + i}`));
	return orders.reverse();
})();

function readEdits(): Edits {
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '');
		return { products: parsed.products ?? {}, shipped: parsed.shipped ?? [] };
	} catch {
		return { products: {}, shipped: [] };
	}
}

function writeEdits(edits: Edits) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
	} catch {}
}

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function products(): StoreProduct[] {
	const edits = readEdits().products;
	return base.map(({ weight, ...p }) => ({ ...p, ...edits[p.handle] }));
}

export function orders(): Order[] {
	const shipped = new Set(readEdits().shipped);
	return baseOrders.map((o) => ({ ...o, shipped: o.shipped || shipped.has(o.id) }));
}

export function editProduct(handle: string, change: Edits['products'][string]) {
	if (!base.some((p) => p.handle === handle)) throw new Error(`No product with the handle ${handle}`);
	const edits = readEdits();
	edits.products[handle] = { ...edits.products[handle], ...change };
	writeEdits(edits);
}

export function ship(id: string) {
	const edits = readEdits();
	if (!edits.shipped.includes(id)) edits.shipped.push(id);
	writeEdits(edits);
}

export function reset() {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {}
}

export { DAYS, dayKey };
