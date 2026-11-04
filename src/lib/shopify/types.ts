export interface Money {
	amount: string;
	currencyCode: string;
}

export interface ShopifyImage {
	url: string;
	altText: string | null;
	width: number | null;
	height: number | null;
}

export interface ProductCard {
	handle: string;
	title: string;
	availableForSale: boolean;
	featuredImage: ShopifyImage | null;
	priceRange: { minVariantPrice: Money };
}

export interface Variant {
	id: string;
	title: string;
	availableForSale: boolean;
	price: Money;
	compareAtPrice: Money | null;
	selectedOptions: { name: string; value: string }[];
	image: ShopifyImage | null;
}

export interface Product extends ProductCard {
	descriptionHtml: string;
	seo: { title: string | null; description: string | null };
	images: { nodes: ShopifyImage[] };
	options: { name: string; optionValues: { name: string }[] }[];
	variants: { nodes: Variant[] };
}

export interface LiveVariant {
	id: string;
	availableForSale: boolean;
	price: Money;
	compareAtPrice: Money | null;
}

export interface Collection {
	handle: string;
	title: string;
	description: string;
	image: ShopifyImage | null;
	products: { nodes: ProductCard[] };
}

export interface CartLine {
	id: string;
	quantity: number;
	cost: { totalAmount: Money };
	merchandise: {
		id: string;
		title: string;
		image: ShopifyImage | null;
		product: { title: string; handle: string };
	};
}

export interface Cart {
	id: string;
	checkoutUrl: string;
	totalQuantity: number;
	cost: { subtotalAmount: Money };
	lines: { nodes: CartLine[] };
}
