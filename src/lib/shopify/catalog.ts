import { shopify } from './client';
import { COLLECTIONS, PRODUCTS } from './queries';
import type { Collection, Product } from './types';

interface ProductPage {
	products: { nodes: Product[]; pageInfo: { hasNextPage: boolean; endCursor: string } };
}

// Fetches 100 products a request rather than one a page, which keeps large catalogs fast to build.
export async function getAllProducts() {
	const products: Product[] = [];
	let cursor: string | null = null;
	do {
		const { products: page }: ProductPage = await shopify<ProductPage>(PRODUCTS, { cursor });
		products.push(...page.nodes);
		cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
	} while (cursor);
	return products;
}

// The Storefront API has no "all products" collection, so the catalog adds one at
// /collections/all/. A real Shopify collection with that handle takes its place.
export const ALL_PRODUCTS = { handle: 'all', title: 'All products' };

export async function getAllCollections() {
	const [{ collections }, products] = await Promise.all([
		shopify<{ collections: { nodes: Collection[] } }>(COLLECTIONS),
		getAllProducts(),
	]);
	if (collections.nodes.some((collection) => collection.handle === ALL_PRODUCTS.handle)) return collections.nodes;
	return [{ ...ALL_PRODUCTS, description: '', image: null, products: { nodes: products } }, ...collections.nodes];
}
