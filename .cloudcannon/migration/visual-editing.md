# Visual editing census

| Page | Section | Treatment | Binding plan | Data completeness | Justification |
| --- | --- | --- | --- | --- | --- |
| All pages | Announcement bar | data-file | `@data[announcement].text`, `@data[announcement].link.label` | `enabled` and link URL sidebar-only | — |
| All pages | Header | data-file + array | `@data[site].title`; `@data[site].nav` array, relative `label` | Link URLs sidebar-only; cart count comes from Shopify | — |
| All pages | Footer | data-file + array | `@data[site].footer_text`; `@data[site].footer_links` array, relative `label` | All in `site.json` | — |
| All pages | Cart drawer | sidebar-only | `shop.json` in the Data Editor | All labels in `shop.json` | Rendered by the browser from Shopify's cart and closed in the editor |
| Page builder | All blocks | page builder | `content_blocks` array, `data-component-key="_type"`, `data-component={_type}` per item, all 7 types registered | — | — |
| Page builder | Hero | text + image | `heading`, `subheading`, `image`/`image_alt`, `button.label` | — | — |
| Page builder | Text | text | `heading`, `content` (markdown, block) | — | — |
| Page builder | Image and text | text + image | `heading`, `content` (markdown, block), `image`/`image_alt`, `button.label`; `image_side` sidebar-only | — | `image_side` is a layout choice |
| Page builder | Featured products | component | `heading`, `intro`, `button.label`; cards looked up from `products` handles in `src/data/shopify/products.json` inside the block | Product titles, photos and prices come from Shopify | — |
| Page builder | Collection grid | component | `heading`; cards looked up from `collections` handles in `src/data/shopify/collections.json` inside the block | Collection titles and photos come from Shopify | — |
| Page builder | Testimonial | text | `quote`, `author`, `role` | — | — |
| Page builder | Call to action | text | `heading`, `text`, `button.label` | — | — |
| Text page | Title and body | text | `title`, `@content` | — | — |
| Journal index | Heading and post list | none | — | Post cards come from the posts collection | Listing page; posts are edited on their own pages |
| Journal post | Title, author, image, body | text + image | `title`, `author`, `image`/`image_alt`, `@content` | Date sidebar-only | — |
| Journal post | Shop this post | component | `featured_products` registered component on `shop`; `heading`; cards looked up from `shop.products` handles in `src/data/shopify/products.json` | Product titles, photos and prices come from Shopify | — |
| Product page | Title, gallery, price, options, description | none | `EditorNote` explains they come from Shopify | Shopify data | Edited in Shopify admin |
| Product page | Tagline | text | `tagline` (product page file; shown empty in the editor build) | — | — |
| Product page | Add to cart button | sidebar-only | `shop.json` in the Data Editor | `add_to_cart_label`, `sold_out_label` | Label switches with the chosen variant's stock in the browser |
| Product page | Sections | page builder | `content_blocks` on the product page file | — | — |
| Product page | From the journal | none | — | Posts whose `shop.products` include this handle | Edited by picking products on each post |
| Collection page | Heading, intro, image | text + image | `heading`, `intro` (markdown, block), `image`/`image_alt` (collection page file; intro shown empty in the editor build) | Heading falls back to the Shopify title when empty | — |
| Collection page | Product grid | none | `EditorNote` explains it comes from Shopify | Shopify data | Membership and order set in Shopify admin |
| Collection page | Blocks | page builder | `content_blocks` on the collection page file | — | — |
