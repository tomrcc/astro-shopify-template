// Writes product and collection summaries to src/data/shopify/. CloudCannon's product and
// collection pickers read them, and page-builder blocks render from them so they can
// re-render in the Visual Editor without calling Shopify.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

const domain = process.env.PUBLIC_SHOPIFY_STORE_DOMAIN || 'mock.shop';
const token = process.env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
const version = process.env.PUBLIC_SHOPIFY_API_VERSION || '2026-10';
const endpoint = domain === 'mock.shop' ? 'https://mock.shop/api' : `https://${domain}/api/${version}/graphql.json`;

const query = /* GraphQL */ `
	query Sync($cursor: String) {
		products(first: 250, after: $cursor, sortKey: TITLE) {
			nodes {
				handle
				title
				availableForSale
				featuredImage {
					url
					altText
					width
					height
				}
				priceRange {
					minVariantPrice {
						amount
						currencyCode
					}
				}
			}
			pageInfo {
				hasNextPage
				endCursor
			}
		}
		collections(first: 100, sortKey: TITLE) {
			nodes {
				handle
				title
				image {
					url
					altText
					width
					height
				}
			}
		}
	}
`;

async function request(variables) {
	const headers = { 'Content-Type': 'application/json' };
	if (token) headers['X-Shopify-Storefront-Access-Token'] = token;
	const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ query, variables }) });
	const { data, errors } = await response.json();
	if (errors?.length) throw new Error(errors.map((error) => error.message).join('\n'));
	return data;
}

function write(path, value) {
	const json = `${JSON.stringify(value, null, 2)}\n`;
	if (existsSync(path) && readFileSync(path, 'utf8') === json) return;
	writeFileSync(path, json);
	console.log(`sync-shopify: updated ${path}`);
}

try {
	const products = [];
	let collections = [];
	let cursor = null;
	do {
		const data = await request({ cursor });
		products.push(...data.products.nodes);
		collections = data.collections.nodes;
		cursor = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
	} while (cursor);

	write('src/data/shopify/products.json', products);
	write('src/data/shopify/collections.json', collections);
} catch (error) {
	// The committed files still serve the pickers, so a failed sync doesn't stop the build.
	console.warn(`sync-shopify: kept the existing files. ${error.message}`);
}
