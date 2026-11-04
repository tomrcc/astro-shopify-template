// @ts-check
import { defineConfig, envField } from 'astro/config';
import netlify from '@astrojs/netlify';
import editableRegions from '@cloudcannon/editable-regions/astro-integration';

export default defineConfig({
	site: 'https://astroshopifytemplate.netlify.app',
	adapter: netlify(),
	integrations: [editableRegions()],
	env: {
		schema: {
			PUBLIC_SHOPIFY_STORE_DOMAIN: envField.string({ context: 'client', access: 'public', default: 'mock.shop' }),
			PUBLIC_SHOPIFY_STOREFRONT_TOKEN: envField.string({ context: 'client', access: 'public', optional: true }),
			PUBLIC_SHOPIFY_API_VERSION: envField.string({ context: 'client', access: 'public', default: '2026-10' }),
		},
	},
});
