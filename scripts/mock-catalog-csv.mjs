// Writes a mock.shop catalog as a Shopify product import CSV, so a new store can start with
// the same handles as the sample content. Each product is tagged with its collections' handles
// for building automated collections.
// Usage: node scripts/mock-catalog-csv.mjs [catalog domain] [stock per variant]
import { writeFileSync } from 'node:fs';

const domain = process.argv[2] || 'coffee.mock.shop';
const stock = Number(process.argv[3] || 20);
const output = 'shopify-products.csv';

const query = /* GraphQL */ `
	query Catalog {
		products(first: 250) {
			nodes {
				handle
				title
				descriptionHtml
				vendor
				productType
				options {
					name
				}
				images(first: 20) {
					nodes {
						url
						altText
					}
				}
				variants(first: 100) {
					nodes {
						sku
						price {
							amount
						}
						compareAtPrice {
							amount
						}
						selectedOptions {
							name
							value
						}
						image {
							url
						}
					}
				}
			}
		}
		collections(first: 100) {
			nodes {
				handle
				products(first: 250) {
					nodes {
						handle
					}
				}
			}
		}
	}
`;

const response = await fetch(`https://${domain}/api`, {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ query }),
});
const { data, errors } = await response.json();
if (errors?.length) throw new Error(errors.map((error) => error.message).join('\n'));

const tags = new Map();
for (const collection of data.collections.nodes) {
	for (const { handle } of collection.products.nodes) {
		tags.set(handle, [...(tags.get(handle) ?? []), collection.handle]);
	}
}

// Header names follow Shopify's current product CSV template.
const columns = [
	'Title', 'URL handle', 'Description', 'Vendor', 'Type', 'Tags', 'Published on online store', 'Status', 'SKU',
	'Option1 name', 'Option1 value', 'Option2 name', 'Option2 value', 'Option3 name', 'Option3 value',
	'Price', 'Compare-at price', 'Charge tax', 'Inventory tracker', 'Inventory quantity',
	'Continue selling when out of stock', 'Requires shipping', 'Fulfillment service',
	'Product image URL', 'Image position', 'Image alt text', 'Variant image URL',
];

const cell = (value) => {
	const text = value == null ? '' : String(value);
	return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const rows = [];
for (const product of data.products.nodes) {
	const variants = product.variants.nodes;
	const images = product.images.nodes;
	// Shopify reads one row per variant; extra images go on extra rows that carry only the handle.
	for (let index = 0; index < Math.max(variants.length, images.length); index++) {
		const row = { 'URL handle': product.handle };
		if (index === 0) {
			Object.assign(row, {
				Title: product.title,
				Description: product.descriptionHtml,
				Vendor: product.vendor,
				Type: product.productType,
				Tags: (tags.get(product.handle) ?? []).join(', '),
				'Published on online store': 'TRUE',
				Status: 'Active',
			});
		}
		const variant = variants[index];
		if (variant) {
			product.options.forEach((option, position) => {
				if (index === 0) row[`Option${position + 1} name`] = option.name;
				row[`Option${position + 1} value`] = variant.selectedOptions.find((selected) => selected.name === option.name)?.value;
			});
			Object.assign(row, {
				SKU: variant.sku,
				Price: variant.price.amount,
				'Compare-at price': variant.compareAtPrice?.amount,
				'Charge tax': 'TRUE',
				'Inventory tracker': 'shopify',
				'Inventory quantity': stock,
				'Continue selling when out of stock': 'DENY',
				'Requires shipping': 'TRUE',
				'Fulfillment service': 'manual',
				'Variant image URL': variant.image?.url,
			});
		}
		const image = images[index];
		if (image) {
			Object.assign(row, { 'Product image URL': image.url, 'Image position': index + 1, 'Image alt text': image.altText });
		}
		rows.push(columns.map((column) => cell(row[column])).join(','));
	}
}

writeFileSync(output, `${[columns.join(','), ...rows].join('\n')}\n`);
console.log(`mock-catalog-csv: wrote ${data.products.nodes.length} products from ${domain} to ${output}`);
