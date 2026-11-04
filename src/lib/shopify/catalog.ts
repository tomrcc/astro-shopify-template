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

export async function getAllCollections() {
	const { collections } = await shopify<{ collections: { nodes: Collection[] } }>(COLLECTIONS);
	return collections.nodes;
}
