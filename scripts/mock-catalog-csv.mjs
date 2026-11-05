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

const columns = [
	'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags', 'Published', 'Status',
	'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value', 'Option3 Name', 'Option3 Value',
	'Variant SKU', 'Variant Inventory Tracker', 'Variant Inventory Qty', 'Variant Inventory Policy',
	'Variant Fulfillment Service', 'Variant Price', 'Variant Compare At Price', 'Variant Requires Shipping',
	'Variant Taxable', 'Variant Image', 'Image Src', 'Image Position', 'Image Alt Text',
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
		const row = { Handle: product.handle };
		if (index === 0) {
			Object.assign(row, {
				Title: product.title,
				'Body (HTML)': product.descriptionHtml,
				Vendor: product.vendor,
				Type: product.productType,
				Tags: (tags.get(product.handle) ?? []).join(', '),
				Published: 'TRUE',
				Status: 'active',
			});
		}
		const variant = variants[index];
		if (variant) {
			product.options.forEach((option, position) => {
				if (index === 0) row[`Option${position + 1} Name`] = option.name;
				row[`Option${position + 1} Value`] = variant.selectedOptions.find((selected) => selected.name === option.name)?.value;
			});
			Object.assign(row, {
				'Variant SKU': variant.sku,
				'Variant Inventory Tracker': 'shopify',
				'Variant Inventory Qty': stock,
				'Variant Inventory Policy': 'deny',
				'Variant Fulfillment Service': 'manual',
				'Variant Price': variant.price.amount,
				'Variant Compare At Price': variant.compareAtPrice?.amount,
				'Variant Requires Shipping': 'TRUE',
				'Variant Taxable': 'TRUE',
				'Variant Image': variant.image?.url,
			});
		}
		const image = images[index];
		if (image) {
			Object.assign(row, { 'Image Src': image.url, 'Image Position': index + 1, 'Image Alt Text': image.altText });
		}
		rows.push(columns.map((column) => cell(row[column])).join(','));
	}
}

writeFileSync(output, `${[columns.join(','), ...rows].join('\n')}\n`);
console.log(`mock-catalog-csv: wrote ${data.products.nodes.length} products from ${domain} to ${output}`);
