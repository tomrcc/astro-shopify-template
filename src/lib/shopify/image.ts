import type { ShopifyImage } from './types';

const widths = [320, 480, 640, 960, 1280, 1600];

// Shopify's CDN resizes on request through the width parameter.
export function shopifyImageAttrs(image: ShopifyImage, sizes: string, maxWidth = 1600) {
	const src = new URL(image.url);
	const usable = widths.filter((width) => width <= maxWidth && (!image.width || width <= image.width));
	const srcset = usable
		.map((width) => {
			src.searchParams.set('width', String(width));
			return `${src} ${width}w`;
		})
		.join(', ');
	src.searchParams.set('width', String(usable.at(-1) ?? maxWidth));
	return {
		src: src.toString(),
		srcset,
		sizes,
		alt: image.altText ?? '',
		width: image.width ?? undefined,
		height: image.height ?? undefined,
	};
}
