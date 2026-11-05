// Writes product and collection summaries to src/data/shopify/. CloudCannon's product and
// collection pickers read them, and page-builder blocks render from them so they can
// re-render in the Visual Editor without calling Shopify.
// Also creates an empty CloudCannon page file for each product and collection without one,
// so every Shopify page is listed in CloudCannon once the files are committed.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

const domain = process.env.PUBLIC_SHOPIFY_STORE_DOMAIN || 'coffee.mock.shop';
const token = process.env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
const version = process.env.PUBLIC_SHOPIFY_API_VERSION || '2026-10';
const mockShop = domain === 'mock.shop' || domain.endsWith('.mock.shop');
const endpoint = mockShop ? `https://${domain}/api` : `https://${domain}/api/${version}/graphql.json`;

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
				products(first: 10) {
					nodes {
						availableForSale
						featuredImage {
							url
							altText
							width
							height
						}
					}
				}
			}
		}
	}
`;

// Collections without an image of their own use a product photo, preferring one that's in
// stock and not already on another card, so neighbouring cards in the grid differ.
const usedImages = new Set();
function coverImage(products) {
	const withImage = products.filter((product) => product.featuredImage);
	const fresh = withImage.filter((product) => !usedImages.has(product.featuredImage.url));
	const pick =
		fresh.find((product) => product.availableForSale) ??
		withImage.find((product) => product.availableForSale) ??
		fresh[0] ??
		withImage[0];
	if (pick) usedImages.add(pick.featuredImage.url);
	return pick?.featuredImage ?? null;
}

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

const pageFiles = [
	{ dir: 'src/content/product-pages', stub: '---\ntagline:\ncontent_blocks: []\n---\n' },
	{ dir: 'src/content/collection-pages', stub: '---\nheading:\nintro:\nimage:\nimage_alt:\ncontent_blocks: []\n---\n' },
];

// Never edits or deletes existing files: they hold editors' content.
function syncPageFiles({ dir, stub }, handles) {
	const existing = readdirSync(dir)
		.filter((file) => file.endsWith('.md'))
		.map((file) => file.slice(0, -3));
	for (const handle of handles) {
		if (existing.includes(handle)) continue;
		writeFileSync(`${dir}/${handle}.md`, stub);
		console.log(`sync-shopify: created ${dir}/${handle}.md`);
	}
	const orphans = existing.filter((handle) => !handles.includes(handle));
	if (orphans.length) console.warn(`sync-shopify: no longer in Shopify, delete if unwanted: ${orphans.map((handle) => `${dir}/${handle}.md`).join(', ')}`);
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

	for (const { image } of collections) if (image) usedImages.add(image.url);
	collections = collections.map(({ handle, title, image, products: members }) => ({
		handle,
		title,
		image: image ?? coverImage(members.nodes),
	}));

	// Matches ALL_PRODUCTS in src/lib/shopify/catalog.ts, so pickers and the collection grid can use it.
	if (!collections.some((collection) => collection.handle === 'all')) {
		collections.unshift({ handle: 'all', title: 'All products', image: coverImage(products) });
	}

	write('src/data/shopify/products.json', products);
	write('src/data/shopify/collections.json', collections);
	syncPageFiles(pageFiles[0], products.map((product) => product.handle));
	syncPageFiles(pageFiles[1], collections.map((collection) => collection.handle));
} catch (error) {
	// The committed files still serve the pickers, so a failed sync doesn't stop the build.
	console.warn(`sync-shopify: kept the existing files. ${error.message}`);
}
