// Runs at build time, in server islands and in the browser. The Storefront token is
// public by design, so it ships to the browser for cart calls.
const domain = import.meta.env.PUBLIC_SHOPIFY_STORE_DOMAIN || 'coffee.mock.shop';
const token = import.meta.env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
const version = import.meta.env.PUBLIC_SHOPIFY_API_VERSION || '2026-10';

export const usingMockShop = domain === 'mock.shop' || domain.endsWith('.mock.shop');

const endpoint = usingMockShop ? `https://${domain}/api` : `https://${domain}/api/${version}/graphql.json`;

export async function shopify<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (token) headers['X-Shopify-Storefront-Access-Token'] = token;

	const response = await fetch(endpoint, {
		method: 'POST',
		headers,
		body: JSON.stringify({ query, variables }),
	});
	if (!response.ok) throw new Error(`Shopify responded ${response.status} ${response.statusText}`);

	const { data, errors } = await response.json();
	if (errors?.length) throw new Error(errors.map((error: { message: string }) => error.message).join('\n'));
	return data;
}
