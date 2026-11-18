// Every store read and write the dashboard and the product pop-up make. Each function runs on
// sample data from ./mock; the README maps each one to the Shopify Admin API call that replaces it.
import * as mock from './mock';
import type { DailySales, Order, Overview, ProductSales, ProductStats, ProductStatus, StoreProduct } from './types';

export type * from './types';

export const LOW_STOCK = 5;
export const currency = mock.currency;

const READ_DELAY = 150;
const WRITE_DELAY = 350;

function dailySales(orders: Order[], handle?: string): DailySales[] {
	const days = new Map<string, DailySales>();
	for (let i = mock.DAYS - 1; i >= 0; i--) {
		const date = mock.dayKey(i);
		days.set(date, { date, sales: 0, orders: 0, units: 0 });
	}
	for (const order of orders) {
		const day = days.get(new Date(order.createdAt).toLocaleDateString('en-CA'));
		if (!day) continue;
		const lines = handle ? order.items.filter((i) => i.handle === handle) : order.items;
		if (!lines.length) continue;
		day.orders += 1;
		for (const line of lines) {
			day.units += line.quantity;
			day.sales += line.price * line.quantity;
		}
	}
	return [...days.values()];
}

function since(days: number): string {
	return mock.dayKey(days - 1);
}

export async function getSalesByProduct(days = mock.DAYS): Promise<ProductSales[]> {
	await mock.wait(READ_DELAY);
	const from = since(days);
	const totals = new Map<string, ProductSales>(
		mock.products().map((p) => [p.handle, { handle: p.handle, title: p.title, units: 0, revenue: 0 }]),
	);
	for (const order of mock.orders()) {
		if (new Date(order.createdAt).toLocaleDateString('en-CA') < from) continue;
		for (const line of order.items) {
			const total = totals.get(line.handle);
			if (!total) continue;
			total.units += line.quantity;
			total.revenue += line.price * line.quantity;
		}
	}
	return [...totals.values()].sort((a, b) => b.revenue - a.revenue);
}

export async function getOverview(): Promise<Overview> {
	const bestSellers = await getSalesByProduct(7);
	const orders = mock.orders();
	const daily = dailySales(orders);
	const week = daily.slice(-7);
	const today = daily[daily.length - 1];
	return {
		currency,
		today: { sales: today.sales, orders: today.orders },
		week: { sales: week.reduce((s, d) => s + d.sales, 0), orders: week.reduce((s, d) => s + d.orders, 0) },
		toShip: orders.filter((o) => !o.shipped).length,
		lowStock: mock.products().filter((p) => p.status === 'active' && p.stock <= LOW_STOCK),
		daily,
		bestSellers,
	};
}

export async function listProducts(): Promise<StoreProduct[]> {
	await mock.wait(READ_DELAY);
	return mock.products();
}

export async function getProductStats(handle: string): Promise<ProductStats | undefined> {
	await mock.wait(READ_DELAY);
	const product = mock.products().find((p) => p.handle === handle);
	if (!product) return undefined;
	const daily = dailySales(mock.orders(), handle);
	const week = daily.slice(-7);
	return {
		product,
		currency,
		week: { units: week.reduce((s, d) => s + d.units, 0), revenue: week.reduce((s, d) => s + d.sales, 0) },
		daily,
	};
}

export async function updateProduct(handle: string, change: { price?: number; status?: ProductStatus }) {
	await mock.wait(WRITE_DELAY);
	if (change.price !== undefined && !(change.price > 0)) throw new Error('Price must be more than zero');
	mock.editProduct(handle, change);
}

export async function setStock(handle: string, quantity: number) {
	await mock.wait(WRITE_DELAY);
	if (!Number.isInteger(quantity) || quantity < 0) throw new Error('Stock must be a whole number, zero or more');
	mock.editProduct(handle, { stock: quantity });
}

export async function listOrders(): Promise<Order[]> {
	await mock.wait(READ_DELAY);
	return mock.orders();
}

export async function markShipped(orderId: string) {
	await mock.wait(WRITE_DELAY);
	mock.ship(orderId);
}

// Demo only: clears every edit made in this browser.
export function resetDemo() {
	mock.reset();
}

export function formatMoney(amount: number, options: Intl.NumberFormatOptions = {}): string {
	return new Intl.NumberFormat('en-NZ', { style: 'currency', currency, ...options }).format(amount);
}
