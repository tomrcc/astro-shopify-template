# Astro Shopify template

A storefront for [CloudCannon](https://cloudcannon.com) where Shopify runs the shop and CloudCannon edits everything around it. Use it to see how the two fit together before deciding whether this setup suits your store.

- **Static pages for everything:** home, landing pages, every collection and every product, built ahead of time with Astro.
- **Live prices:** a server island checks price and stock with Shopify and is cached on the CDN for a minute at a time.
- **Shopify's cart and checkout:** the cart drawer talks to the Storefront API from the browser and hands off to Shopify's hosted checkout.
- **Visual editing:** pages, product stories and collection intros are editable in CloudCannon's Visual Editor.

It runs against [mock.shop](https://mock.shop), Shopify's demo store, until you point it at your own. You can run it locally, deploy it and edit it without a Shopify account.

## Who owns what

| Content | Edited in | Where it lives |
| --- | --- | --- |
| Products, variants, prices, stock, product photos and descriptions | Shopify admin | Shopify |
| Collections and which products they contain | Shopify admin | Shopify |
| Cart, checkout, orders, customers | Shopify | Shopify |
| Home, about and landing pages | CloudCannon | `src/content/pages/` |
| Product stories: a tagline and sections on a product page | CloudCannon | `src/content/product-stories/` |
| Collection intros: heading, intro, image and sections on a collection page | CloudCannon | `src/content/collection-intros/` |
| Navigation, footer, announcement bar, shop labels | CloudCannon | `src/data/*.json` |

A product story or collection intro is matched to Shopify by its handle (the `product` or `collection` field). Products and collections without one still get a page.

## How it fits together

```
Shopify ──(build: catalog)──► Astro build ──► static HTML on the host's CDN
   ▲                                                 │
   │  live price island (CDN-cached, 60s)  ◄─────────┤
   │  cart + checkout (browser → Storefront API) ◄───┘
   │
CloudCannon ──(git commit)──► repo ──► production build on the host
```

There are two builds of the same repo:

- **Production** runs on Netlify through `@astrojs/netlify` and serves shoppers. See [Choosing a host](docs/choosing-a-host.md) for other hosts.
- **The editor build** runs on CloudCannon with `PUBLIC_EDITOR_BUILD=true`. It's a static copy for editing and never serves shoppers.

## Setup

Work through these in order. Steps 1 to 4 need no Shopify account.

### 1. Run it locally

Requires Node 22.23.4 or later (`.nvmrc` pins 24).

```sh
npm install
npm run dev
```

Open the URL `astro dev` prints. It runs in the background; stop it with `npx astro dev stop`.

Pages to look at:

- `/`: a page built from sections
- `/products/the-complete-snowboard/`: a product page with a product story
- `/products/the-multi-managed-snowboard/`: a product page without one
- `/collections/all/`: a collection with an intro

### 2. Push it to a git repository

Create a repository on GitHub, GitLab or Bitbucket and push this folder to it. Commit `src/data/shopify/`, since CloudCannon's product pickers read those files from the repo.

### 3. Deploy to Netlify

1. In Netlify, add a new project from the repository.
2. Leave the build settings as they are. `netlify.toml` sets the build command (`npm run build`, which runs the Shopify sync first) and the `dist` output. Netlify reads the Node version from `.nvmrc`.
3. Don't set `PUBLIC_EDITOR_BUILD` on Netlify. It turns off live prices and the cart.

Check the live site: product prices load, and adding to the cart opens the drawer with a working checkout link.

### 4. Create the CloudCannon site

1. In CloudCannon, create a site from the same repository.
2. `.cloudcannon/initial-site-settings.json` sets the build command, the `dist` output, the Node version and `PUBLIC_EDITOR_BUILD=true` when the site is created. For an existing site, set these in the site's build settings.
3. Once the build finishes, open a page in the Visual Editor.

Saving in CloudCannon commits to the repository, and Netlify builds production from that push.

### 5. Use your own Shopify store

1. In Shopify admin, install the **Headless** sales channel and create a storefront. Copy its public access token.
2. Set these on Netlify, on CloudCannon and in a local `.env` (see `.env.example`):
   - `PUBLIC_SHOPIFY_STORE_DOMAIN`: such as `your-store.myshopify.com`.
   - `PUBLIC_SHOPIFY_STOREFRONT_TOKEN`: the public access token. It's designed to be public and reaches the browser for cart calls. The build needs it because Shopify limits tokenless requests to a query cost of 1,000, and the catalog queries cost more.
   - `PUBLIC_SHOPIFY_API_VERSION`: defaults to `2026-10`. Shopify supports each version for a year.
3. Run `npm run sync:shopify` and commit `src/data/shopify/`.
4. Replace the handles in the sample content with your own:
   - the `product` field in `src/content/product-stories/`
   - the `collection` field in `src/content/collection-intros/`
   - `products` and `collections` in the page sections
   - collection links in `src/data/site.json`
5. Set `site` in `astro.config.mjs` to the production URL.

### 6. Rebuild when the catalog changes

Pages hold the catalog as it was at the last build. Add webhooks in Shopify admin (**Settings > Notifications > Webhooks**) for product and collection create, update and delete. Point each one at a Netlify build hook (under **Build hooks** in the build and deploy settings).

The editor's preview picks up catalog changes the next time CloudCannon builds, which happens on every save.

A busy store can fire many webhooks in a few minutes, and each one starts a build. To batch them, put a small function in front of the build hook that waits a few minutes before triggering it.

Prices and stock between builds come from the live price island. Shopify checks them again at checkout.

## Scripts

- `npm run dev`: starts the dev server in the background (`npx astro dev stop` to stop it).
- `npm run build`: syncs the Shopify catalog, then builds. Add `PUBLIC_EDITOR_BUILD=true` to build what CloudCannon builds.
- `npm run sync:shopify`: writes product and collection summaries to `src/data/shopify/`. If Shopify can't be reached it keeps the existing files and the build carries on.
- `npx astro check`: type-checks the project.
- `npx @cloudcannon/cli validate`: checks `cloudcannon.config.yml`, the structure files and the initial site settings.

## The editor build

On the CloudCannon build, read through `src/lib/editor-build.ts`:

- The price renders from the build's catalog instead of the `LivePrice` server island.
- Adding to the cart does nothing.
- `<EditorNote>` marks parts that aren't edited in CloudCannon with a small icon that explains where they come from. It renders nothing outside the editor build.

The flag exists because the Visual Editor's preview has no server. Without it, the island's request would fail inside the editor.

Keep editor-owned pages prerendered. On-demand routes don't exist in the static build, so CloudCannon can't open them.

## Picking products in CloudCannon

The product and collection pickers read `src/data/shopify/` from the repository. New products appear in them once someone runs `npm run sync:shopify` and commits the result.

The **Featured products** and **Collection grid** sections render from the same files, so they re-render in the Visual Editor without calling Shopify. Production builds run the sync first, so live pages always use the current catalog.

## Code map

- `src/lib/shopify/`: the Storefront API client, queries, types, the cart and image helpers.
- `src/pages/products/[handle].astro` and `src/pages/collections/[handle].astro`: one page per Shopify product and collection, plus `/collections/all/`, which lists every product. Shopify's API has no such collection, so `getAllCollections` in `src/lib/shopify/catalog.ts` and the sync both add it. A Shopify collection with the handle `all` replaces it.
- `src/pages/[...slug].astro`: pages from `src/content/pages/`.
- `src/components/server/LivePrice.astro`: the live price island. Its CDN headers are Netlify's; see the hosting guide for others.
- `src/components/shop/`: the product form, cart drawer, price and product card.
- `src/components/blocks/`: page-builder sections.
- `src/cloudcannon/componentMap.ts`: the section types the page builder and the Visual Editor both use.
- `cloudcannon.config.yml`: collections, inputs and pickers.
- `.cloudcannon/README.md`: the guide editors see in CloudCannon.
- `.cloudcannon/migration/visual-editing.md`: how each part of each page is made editable.
- `scripts/sync-shopify.mjs`: the catalog sync.

The product form is a plain element wired up by a script rather than a custom element: Astro sets up a server island twice when it sits inside a custom element tag, which adds an unused preload request.

### Adding a section type

1. Add the component to `src/components/blocks/`. It must render from its props alone, without `astro:content` or network calls, so it can re-render in the Visual Editor.
2. Add its schema to the `blocks` union in `src/content.config.ts`.
3. Add a `<type>.cloudcannon.structure-value.yml` beside it, with the default `value` and `_inputs`.
4. Register it in `src/cloudcannon/componentMap.ts` under its `_type`.
5. Add its row to `.cloudcannon/migration/visual-editing.md`.

## Troubleshooting

- **The build fails with "Complexity exceeded":** the store has no Storefront token set. Add `PUBLIC_SHOPIFY_STOREFRONT_TOKEN`.
- **A new product is missing from CloudCannon's picker:** run `npm run sync:shopify` and commit `src/data/shopify/`.
- **A product story doesn't show on its product page:** check its `product` field matches the Shopify handle exactly.
- **Prices don't load on the live site:** check `PUBLIC_EDITOR_BUILD` isn't set on the production host.
- **A page won't open in the Visual Editor:** it must be prerendered and its file's collection `url` must match the built path.

## Is this setup right for your store?

It suits brand-led stores with a modest catalog, where editors care about the pages around the products. For very large or fast-changing catalogs, deep customer accounts, B2B or subscriptions, read [Shopify on CloudCannon](https://github.com/tomrcc/shopify-cloudcannon) first. It compares this setup with Liquid themes, Hydrogen and a hybrid of the two.
