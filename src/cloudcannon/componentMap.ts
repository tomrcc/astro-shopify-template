import Hero from '../components/blocks/Hero.astro';
import Text from '../components/blocks/Text.astro';
import ImageText from '../components/blocks/ImageText.astro';
import FeaturedProducts from '../components/blocks/FeaturedProducts.astro';
import CollectionGrid from '../components/blocks/CollectionGrid.astro';
import Testimonial from '../components/blocks/Testimonial.astro';
import Cta from '../components/blocks/Cta.astro';

// Keys are the `_type` values in content_blocks.
export const componentMap: Record<string, any> = {
	hero: Hero,
	text: Text,
	image_text: ImageText,
	featured_products: FeaturedProducts,
	collection_grid: CollectionGrid,
	testimonial: Testimonial,
	cta: Cta,
};
