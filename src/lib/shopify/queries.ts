const image = /* GraphQL */ `
	fragment ImageFields on Image {
		url
		altText
		width
		height
	}
`;

const productCard = /* GraphQL */ `
	fragment ProductCardFields on Product {
		handle
		title
		availableForSale
		featuredImage {
			...ImageFields
		}
		priceRange {
			minVariantPrice {
				amount
				currencyCode
			}
		}
	}
	${image}
`;

export const PRODUCTS = /* GraphQL */ `
	query Products($cursor: String) {
		products(first: 100, after: $cursor, sortKey: TITLE) {
			nodes {
				...ProductCardFields
				descriptionHtml
				seo {
					title
					description
				}
				images(first: 10) {
					nodes {
						...ImageFields
					}
				}
				options {
					name
					optionValues {
						name
					}
				}
				variants(first: 100) {
					nodes {
						id
						title
						availableForSale
						price {
							amount
							currencyCode
						}
						compareAtPrice {
							amount
							currencyCode
						}
						selectedOptions {
							name
							value
						}
						image {
							...ImageFields
						}
					}
				}
			}
			pageInfo {
				hasNextPage
				endCursor
			}
		}
	}
	${productCard}
`;

export const LIVE_VARIANTS = /* GraphQL */ `
	query LiveVariants($handle: String!) {
		product(handle: $handle) {
			variants(first: 100) {
				nodes {
					id
					availableForSale
					price {
						amount
						currencyCode
					}
					compareAtPrice {
						amount
						currencyCode
					}
				}
			}
		}
	}
`;

export const COLLECTIONS = /* GraphQL */ `
	query Collections {
		collections(first: 100, sortKey: TITLE) {
			nodes {
				handle
				title
				description
				image {
					...ImageFields
				}
				products(first: 100) {
					nodes {
						...ProductCardFields
					}
				}
			}
		}
	}
	${productCard}
`;

const cart = /* GraphQL */ `
	fragment CartFields on Cart {
		id
		checkoutUrl
		totalQuantity
		cost {
			subtotalAmount {
				amount
				currencyCode
			}
		}
		lines(first: 100) {
			nodes {
				id
				quantity
				cost {
					totalAmount {
						amount
						currencyCode
					}
				}
				merchandise {
					... on ProductVariant {
						id
						title
						image {
							...ImageFields
						}
						product {
							title
							handle
						}
					}
				}
			}
		}
	}
	${image}
`;

export const CART = /* GraphQL */ `
	query Cart($id: ID!) {
		cart(id: $id) {
			...CartFields
		}
	}
	${cart}
`;

export const CART_CREATE = /* GraphQL */ `
	mutation CartCreate($lines: [CartLineInput!]) {
		cartCreate(input: { lines: $lines }) {
			cart {
				...CartFields
			}
			userErrors {
				message
			}
		}
	}
	${cart}
`;

export const CART_LINES_ADD = /* GraphQL */ `
	mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
		cartLinesAdd(cartId: $cartId, lines: $lines) {
			cart {
				...CartFields
			}
			userErrors {
				message
			}
		}
	}
	${cart}
`;

export const CART_LINES_UPDATE = /* GraphQL */ `
	mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
		cartLinesUpdate(cartId: $cartId, lines: $lines) {
			cart {
				...CartFields
			}
			userErrors {
				message
			}
		}
	}
	${cart}
`;
