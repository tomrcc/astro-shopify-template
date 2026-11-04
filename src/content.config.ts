import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const link = z.object({
	label: z.string().nullish(),
	url: z.string().nullish(),
});

const blocks = z.discriminatedUnion('_type', [
	z.object({
		_type: z.literal('hero'),
		heading: z.string(),
		subheading: z.string().nullish(),
		image: z.string().nullish(),
		image_alt: z.string().nullish(),
		button: link,
	}),
	z.object({
		_type: z.literal('text'),
		heading: z.string().nullish(),
		content: z.string().nullish(),
	}),
	z.object({
		_type: z.literal('image_text'),
		heading: z.string().nullish(),
		content: z.string().nullish(),
		image: z.string().nullish(),
		image_alt: z.string().nullish(),
		image_side: z.enum(['left', 'right']).nullish(),
		button: link,
	}),
	z.object({
		_type: z.literal('featured_products'),
		heading: z.string().nullish(),
		intro: z.string().nullish(),
		products: z.array(z.string()).default([]),
		button: link,
	}),
	z.object({
		_type: z.literal('collection_grid'),
		heading: z.string().nullish(),
		collections: z.array(z.string()).default([]),
	}),
	z.object({
		_type: z.literal('testimonial'),
		quote: z.string().nullish(),
		author: z.string().nullish(),
		role: z.string().nullish(),
	}),
	z.object({
		_type: z.literal('cta'),
		heading: z.string().nullish(),
		text: z.string().nullish(),
		button: link,
	}),
]);

export type Block = z.infer<typeof blocks>;
export type BlockProps<T extends Block['_type']> = Omit<Extract<Block, { _type: T }>, '_type'>;

const pageFields = {
	title: z.string(),
	description: z.string().nullish(),
};

const pages = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
	schema: z.union([
		z.object({ ...pageFields, content_blocks: z.array(blocks) }),
		z.object(pageFields),
	]),
});

// Editorial content around a Shopify product, matched by its handle.
const productStories = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/product-stories' }),
	schema: z.object({
		product: z.string(),
		tagline: z.string().nullish(),
		content_blocks: z.array(blocks).default([]),
	}),
});

// Editorial content around a Shopify collection, matched by its handle.
const collectionIntros = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/collection-intros' }),
	schema: z.object({
		collection: z.string(),
		heading: z.string().nullish(),
		intro: z.string().nullish(),
		image: z.string().nullish(),
		image_alt: z.string().nullish(),
		content_blocks: z.array(blocks).default([]),
	}),
});

export const collections = { pages, 'product-stories': productStories, 'collection-intros': collectionIntros };
