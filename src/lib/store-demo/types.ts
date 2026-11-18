export type ProductStatus = 'active' | 'draft';

export interface StoreProduct {
	handle: string;
	title: string;
	image: string | null;
	price: number;
	stock: number;
	status: ProductStatus;
}

export interface OrderLine {
	handle: string;
	title: string;
	quantity: number;
	price: number;
}

export interface Order {
	id: string;
	createdAt: string;
	customer: string;
	city: string;
	items: OrderLine[];
	total: number;
	shipped: boolean;
}

export interface DailySales {
	date: string; // YYYY-MM-DD, the browser's local day
	sales: number;
	orders: number;
	units: number;
}

export interface ProductSales {
	handle: string;
	title: string;
	units: number;
	revenue: number;
}

export interface Overview {
	currency: string;
	today: { sales: number; orders: number };
	week: { sales: number; orders: number };
	toShip: number;
	lowStock: StoreProduct[];
	daily: DailySales[];
	bestSellers: ProductSales[];
}

export interface ProductStats {
	product: StoreProduct;
	currency: string;
	week: { units: number; revenue: number };
	daily: DailySales[];
}
