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
			PUBLIC_SHOPIFY_STORE_DOMAIN: envField.string({ context: 'client', access: 'public', default: 'coffee.mock.shop' }),
			PUBLIC_SHOPIFY_STOREFRONT_TOKEN: envField.string({ context: 'client', access: 'public', optional: true }),
			PUBLIC_SHOPIFY_API_VERSION: envField.string({ context: 'client', access: 'public', default: '2026-10' }),
			// Production host only, so editor traffic never reaches GA.
			GA_MEASUREMENT_ID: envField.string({ context: 'server', access: 'public', optional: true }),
			// CloudCannon editor build only. Without ANALYTICS_ENABLED no analytics output is built.
			ANALYTICS_ENABLED: envField.boolean({ context: 'server', access: 'public', default: false }),
			GA_PROPERTY_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
			// Service account JSON, raw or base64.
			GA_CREDENTIALS: envField.string({ context: 'server', access: 'secret', optional: true }),
			// CloudCannon editor build only. Builds the /store/ dashboard demo and its product pop-up.
			STORE_DEMO: envField.boolean({ context: 'server', access: 'public', default: false }),
		},
	},
});
