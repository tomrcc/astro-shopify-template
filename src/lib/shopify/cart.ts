// Browser-only. Shopify owns the cart; this keeps its ID and broadcasts each new state.
import { shopify } from './client';
import { CART, CART_CREATE, CART_LINES_ADD, CART_LINES_UPDATE } from './queries';
import type { Cart } from './types';

const storageKey = 'shopify-cart-id';

interface CartPayload {
	cart: Cart | null;
	userErrors: { message: string }[];
}

function publish(cart: Cart | null) {
	try {
		if (cart) localStorage.setItem(storageKey, cart.id);
		else localStorage.removeItem(storageKey);
	} catch {}
	document.dispatchEvent(new CustomEvent('cart:change', { detail: cart }));
	return cart;
}

function unwrap(payload: CartPayload) {
	if (payload.userErrors.length) throw new Error(payload.userErrors.map((error) => error.message).join('\n'));
	return publish(payload.cart);
}

function storedId() {
	try {
		return localStorage.getItem(storageKey);
	} catch {
		return null;
	}
}

// Shopify returns null for carts that expired or went through checkout.
export async function loadCart() {
	const id = storedId();
	if (!id) return publish(null);
	const { cart } = await shopify<{ cart: Cart | null }>(CART, { id });
	return publish(cart);
}

export async function addToCart(merchandiseId: string, quantity = 1) {
	const lines = [{ merchandiseId, quantity }];
	const cartId = storedId();
	if (cartId) {
		const { cartLinesAdd } = await shopify<{ cartLinesAdd: CartPayload }>(CART_LINES_ADD, { cartId, lines });
		if (cartLinesAdd.cart) return unwrap(cartLinesAdd);
	}
	const { cartCreate } = await shopify<{ cartCreate: CartPayload }>(CART_CREATE, { lines });
	return unwrap(cartCreate);
}

export async function setLineQuantity(lineId: string, quantity: number) {
	const cartId = storedId();
	if (!cartId) return null;
	const { cartLinesUpdate } = await shopify<{ cartLinesUpdate: CartPayload }>(CART_LINES_UPDATE, {
		cartId,
		lines: [{ id: lineId, quantity }],
	});
	return unwrap(cartLinesUpdate);
}
