# Astro Shopify template

A storefront for [CloudCannon](https://cloudcannon.com) where Shopify runs the shop and CloudCannon edits everything around it. Use it to see how the two fit together before deciding whether this setup suits your store.

- **Static pages for everything:** home, landing pages, every collection and every product, built ahead of time with Astro.
- **Live prices:** a server island checks price and stock with Shopify and is cached on the CDN for a minute at a time.
- **Shopify's cart and checkout:** the cart drawer talks to the Storefront API from the browser and hands off to Shopify's hosted checkout.
- **Visual editing:** pages, Journal posts, and the content around each product and collection are editable in CloudCannon's Visual Editor.
- **Content that sells:** Journal posts pick the products they mention, and each product page lists the posts that mention it.

It runs against Sunbeam Brew Co. (`coffee.mock.shop`), one of Shopify's [mock.shop](https://mock.shop) sample catalogs, until you point it at your own store. You can run it locally, deploy it and edit it without a Shopify account.

## Who owns what

| Content | Edited in | Where it lives |
| --- | --- | --- |
| Products, variants, prices, stock, product photos and descriptions | Shopify admin | Shopify |
| Collections and which products they contain | Shopify admin | Shopify |
| Cart, checkout, orders, customers | Shopify | Shopify |
| Home, about and landing pages | CloudCannon | `src/content/pages/` |
| Journal posts, and the products each one links to | CloudCannon | `src/content/posts/` |
| Product pages: a tagline and sections on a product page | CloudCannon | `src/content/product-pages/` |
| Collection pages: heading, intro, image and sections on a collection page | CloudCannon | `src/content/collection-pages/` |
| Navigation, footer, announcement bar, shop labels | CloudCannon | `src/data/*.json` |

Each product and collection page file is named after its Shopify handle, such as `src/content/product-pages/ceramic-mug.md`. `npm run sync:shopify` creates an empty one for every product and collection that doesn't have one, so each appears in CloudCannon once the files are committed. It never edits or deletes existing files: when something leaves Shopify, the sync lists its file for you to delete.

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
- `/products/terracotta-pour-over-coffee-set/`: a product page with tagline, sections and Journal posts
- `/products/ceramic-mug/`: a product page with nothing added in CloudCannon yet
- `/collections/all/`: a collection with an intro
- `/blog/pour-over-at-home/`: a Journal post with products to shop

### 2. Push it to a git repository

Create a repository on GitHub, GitLab or Bitbucket and push this folder to it. Commit `src/data/shopify/`, since CloudCannon's product pickers read those files from the repo.

### 3. Deploy to Netlify

1. In Netlify, add a new project from the repository.
2. Leave the build settings as they are. `netlify.toml` sets the build command (`npm run build`, which runs the Shopify sync first) and the `dist` output. Netlify reads the Node version from `.nvmrc`.
3. Don't set `PUBLIC_EDITOR_BUILD` on Netlify. It turns off live prices and the cart.

Check the live site: product prices load, and adding to the cart opens the drawer with a working checkout link.

### 4. Create the CloudCannon site

1. In CloudCannon, create a site and connect your git provider when asked. Choose the repository and the branch Netlify deploys from. `npx @cloudcannon/cli sites create` does the same from the command line.
2. `.cloudcannon/initial-site-settings.json` sets the build command, the `dist` output, the Node version and `PUBLIC_EDITOR_BUILD=true` when the site is created. CloudCannon reads it only then. For an existing site, set these in **Site Settings > Builds > Configuration**, or with `npx @cloudcannon/cli sites update-build-config`.
3. Once the build finishes, check:
   - the build log shows the Shopify sync running before `astro build`
   - `/` opens in the Visual Editor
   - Shopify-owned parts of product pages show a purple icon in the Visual Editor
   - the **Products** field under **Shop this post** on a Journal post lists the coffee products
4. Invite your editors to the site.

Saving in CloudCannon commits to the branch, and Netlify builds production from that push, so every save goes live. To review changes first, connect CloudCannon to a staging branch and publish to the production branch from there.

### 5. Use your own Shopify store

mock.shop is read-only: you can't add products or change prices and stock there. Connect your own store to do that. To try it out, a development store with the sample catalog keeps the sample content working, and gives you full control over products, prices and stock.

1. **Create the store.** For a test store, create a development store and don't add generated test data. The test data adds a warehouse location of its own, and with a second location the import below can't set stock, and products can show as sold out on the site.
2. **Add the Headless channel.** In Shopify admin, install the **Headless** sales channel and create a storefront. Under its Storefront API settings, copy the public access token. Don't use the private token: it must never reach the browser.
3. **Add products,** either way:
   - **The sample catalog.** Run `npm run catalog:csv`, then import `shopify-products.csv` under **Products > Import**. It has the 8 sample products under the sample handles, so the sample content keeps working. Each variant starts with 20 in stock. Check one product's inventory after the import: if it shows 0, the store has more than one location (see step 1), so set stock under **Products > Inventory**.
   - **Your own products.** Then replace the sample content's handles (item 8).
4. **Add collections.** For the sample catalog, create two automated collections, each matching products whose tag equals its handle: **Artisanal Morning Rituals** (`artisanal-morning-rituals`) and **Precision Home Brewing** (`precision-home-brewing`). Check each handle under the collection's search engine listing.
5. **Publish to Headless.** Add every product and collection to the **Headless** sales channel. Anything not published there doesn't reach the site.
6. **Allow test checkouts.** Turn on test payments under **Settings > Payments**, and make sure **Settings > Shipping and delivery** has a rate, so a test order can reach the end of checkout.
7. **Connect the site.** Set these in a local `.env` (see `.env.example`), and on Netlify and CloudCannon:
   - `PUBLIC_SHOPIFY_STORE_DOMAIN`: the store's `.myshopify.com` domain, shown under **Settings > Domains**.
   - `PUBLIC_SHOPIFY_STOREFRONT_TOKEN`: the public access token from item 2. It's designed to be public and reaches the browser for cart calls. The build needs it because Shopify limits tokenless requests to a query cost of 1,000, and the catalog queries cost more.
   - `PUBLIC_SHOPIFY_API_VERSION`: optional, defaults to `2026-10`. Shopify supports each version for a year.

   On CloudCannon they go under **Site Settings > Builds**, next to `PUBLIC_EDITOR_BUILD`. They only apply at build time, so rebuild after changing them. With the CLI, end the list with `...` to keep the existing variables: `--environment-variables "PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com,..."`. Without it, the list replaces them and removes `PUBLIC_EDITOR_BUILD`.
8. **Sync and commit.** Run `npm run sync:shopify`. With the sample catalog, the only changes are image URLs. Commit `src/data/shopify/` and any new files in `src/content/product-pages/` and `src/content/collection-pages/`. With your own products, also replace the sample content:
   - delete the sample product and collection page files the sync lists as no longer in Shopify
   - `shop.products` in `src/content/posts/`
   - `products` and `collections` in the page sections
   - collection links in `src/data/site.json`
9. **Check it locally.** Run `npm run dev`. Product prices load, and a test order goes through checkout. Change a price or stock level in Shopify: the product page shows it within a minute, without a rebuild.
10. **Finish up.** Set `site` in `astro.config.mjs` to the production URL, and rewrite `.cloudcannon/README.md`, the guide editors see in CloudCannon, for your store.

To go back to the sample catalog, remove the store variables everywhere, run `npm run sync:shopify` and commit.

### 6. Keep up with catalog changes

Shopify is the source of truth for products, and CloudCannon for the content around them. Two things follow a catalog change.

**The live site.** Pages hold the catalog as it was at the last build. Add webhooks in Shopify admin (**Settings > Notifications > Webhooks**) for product and collection create, update and delete, and point each one at a Netlify build hook (under **Build hooks** in the build and deploy settings). A busy store can fire many webhooks in a few minutes, and each one starts a build. To batch them, put a small function in front of the build hook that waits a few minutes before triggering it.

Prices and stock between builds come from the live price island. Shopify checks them again at checkout.

**CloudCannon.** The editor's preview picks up catalog changes the next time CloudCannon builds, which happens on every save. The product and collection pickers, and the list of product and collection pages, come from the repository instead. To bring them up to date, run `npm run sync:shopify` and commit the result.

To do that automatically, a scheduled GitHub Action can run the sync and commit any changes. Each commit rebuilds the live site and CloudCannon, so new products appear in CloudCannon without anyone running the sync. Every catalog change, including a price change, becomes a commit, so pick a schedule that suits how often the catalog changes:

```yaml
# .github/workflows/sync-shopify.yml
name: Sync Shopify
on:
  schedule:
    - cron: '0 18 * * *'
  workflow_dispatch:
permissions:
  contents: write
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
      - run: npm run sync:shopify
        env:
          PUBLIC_SHOPIFY_STORE_DOMAIN: ${{ vars.PUBLIC_SHOPIFY_STORE_DOMAIN }}
          PUBLIC_SHOPIFY_STOREFRONT_TOKEN: ${{ vars.PUBLIC_SHOPIFY_STOREFRONT_TOKEN }}
      - run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add src/data/shopify src/content/product-pages src/content/collection-pages
          git diff --cached --quiet || (git commit -m "Sync Shopify catalog" && git push)
```

The sync needs no installed dependencies. Set the two variables under the repository's **Settings > Secrets and variables > Actions > Variables**.

## Scripts

- `npm run dev`: starts the dev server in the background (`npx astro dev stop` to stop it).
- `npm run build`: syncs the Shopify catalog, then builds. Add `PUBLIC_EDITOR_BUILD=true` to build what CloudCannon builds.
- `npm run sync:shopify`: writes product and collection summaries to `src/data/shopify/`, and creates a page file for each new product and collection. If Shopify can't be reached it keeps the existing files and the build carries on.
- `npm run catalog:csv`: writes the coffee.mock.shop catalog to `shopify-products.csv` for Shopify's product import. Pass another catalog's domain and a stock level to change them: `npm run catalog:csv -- books.mock.shop 50`.
- `npx astro check`: type-checks the project.
- `npx @cloudcannon/cli validate`: checks `cloudcannon.config.yml`, the structure files and the initial site settings.

## The editor build

On the CloudCannon build, read through `src/lib/editor-build.ts`:

- The price renders from the build's catalog instead of the `LivePrice` server island.
- Adding to the cart does nothing.
- `<EditorNote>` marks parts that aren't edited in CloudCannon with a small icon that explains where they come from. It renders nothing outside the editor build, and stays hidden on the editor build's own URL until the Visual Editor sets `window.inEditorMode`.

The flag exists because the Visual Editor's preview has no server. Without it, the island's request would fail inside the editor.

Keep editor-owned pages prerendered. On-demand routes don't exist in the static build, so CloudCannon can't open them.

To try the CloudCannon setup without pushing, build the editor build and serve it with CloudCannon's local editor:

```sh
PUBLIC_EDITOR_BUILD=true npm run build
npx @cloudcannon/cli dev dist
```

It doesn't rebuild on its own. Run the build again after each change to see it in the preview.

## Picking products in CloudCannon

The product and collection pickers read `src/data/shopify/` from the repository. New products appear in them once someone runs `npm run sync:shopify` and commits the result.

The **Featured products** and **Collection grid** sections render from the same files, so they re-render in the Visual Editor without calling Shopify. Production builds run the sync first, so live pages always use the current catalog.

## Code map

- `src/lib/shopify/`: the Storefront API client, queries, types, the cart and image helpers.
- `src/pages/products/[handle].astro` and `src/pages/collections/[handle].astro`: one page per Shopify product and collection, plus `/collections/all/`, which lists every product. Shopify's API has no such collection, so `getAllCollections` in `src/lib/shopify/catalog.ts` and the sync both add it. A Shopify collection with the handle `all` replaces it.
- `src/pages/[...slug].astro`: pages from `src/content/pages/`.
- `src/pages/blog/`: the Journal index and one page per post in `src/content/posts/`.
- `scripts/mock-catalog-csv.mjs`: turns a mock.shop catalog into a Shopify import CSV.
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
- **A product shows "Sold out" but has stock:** its stock is at a location that doesn't fulfil online orders, such as the warehouse Shopify's generated test data adds. Check the product's inventory in Shopify admin, or turn off tracking.
- **Imported products have 0 stock:** the store has more than one location, so Shopify ignores the CSV's stock column. Set stock under **Products > Inventory**.
- **A product or collection is missing from the site:** publish it to the **Headless** channel, then rebuild.
- **A new product is missing from CloudCannon's pickers:** run `npm run sync:shopify` and commit `src/data/shopify/`.
- **A product is missing from CloudCannon's Product pages:** run `npm run sync:shopify` and commit the new file in `src/content/product-pages/`.
- **Prices don't load on the live site:** check `PUBLIC_EDITOR_BUILD` isn't set on the production host.
- **A page won't open in the Visual Editor:** it must be prerendered and its file's collection `url` must match the built path.

## Is this setup right for your store?

It suits brand-led stores with a modest catalog, where editors care about the pages around the products. For very large or fast-changing catalogs, deep customer accounts, B2B or subscriptions, read [Shopify on CloudCannon](https://github.com/tomrcc/shopify-cloudcannon) first. It compares this setup with Liquid themes, Hydrogen and a hybrid of the two.
