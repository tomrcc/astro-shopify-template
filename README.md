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

## Analytics in CloudCannon

Editors can see Google Analytics (GA4) numbers for the live site without leaving CloudCannon:

- **Dashboard:** **Insights > Analytics** opens `/analytics/`, with site totals, a daily trend, top pages, views by page type (products, collections, Journal, pages), channels, devices and a table of every page.
- **Per-page pop-up:** every page opened in the Visual Editor shows that page's views, users, engagement, bounce rate, daily trend and top sources in the bottom-left corner.

The two builds split the work:

- **Netlify** carries the GA4 tracking tag when `GA_MEASUREMENT_ID` is set, and builds no analytics pages.
- **The editor build** reads the GA4 Data API during the build when `ANALYTICS_ENABLED` is set, and writes the dashboard and `/analytics/pages.json`, the pop-up's data. Without `GA_PROPERTY_ID` and `GA_CREDENTIALS` it uses generated mock data, labelled **Mock data** on the dashboard.

The data is as fresh as the last CloudCannon build, and covers the last 28 days ending yesterday. The pop-up only loads behind `window.inEditorMode`, and shows nothing when `pages.json` is missing.

| Variable | Set on | Purpose |
| --- | --- | --- |
| `GA_MEASUREMENT_ID` | Netlify | Adds the gtag tracking snippet. Public by design. |
| `ANALYTICS_ENABLED` | CloudCannon | Builds `/analytics/` and `pages.json` |
| `GA_PROPERTY_ID` | CloudCannon | The numeric GA4 property ID the build reads |
| `GA_CREDENTIALS` | CloudCannon | A service account JSON key, raw or base64. The only secret. |

The build fails if `ANALYTICS_ENABLED` is set without `PUBLIC_EDITOR_BUILD`, or together with `GA_MEASUREMENT_ID`, since either means the dashboard is about to be published on the live site. `GA_PROPERTY_ID` and `GA_CREDENTIALS` are declared `access: "secret"` in `astro.config.mjs`, so they never reach the built site.

### Try it with mock data

Set `ANALYTICS_ENABLED=true` on the CloudCannon site under **Site Settings > Builds**, next to `PUBLIC_EDITOR_BUILD`, and rebuild. Locally:

```sh
PUBLIC_EDITOR_BUILD=true ANALYTICS_ENABLED=true npm run build
npx @cloudcannon/cli dev dist
```

### Set up analytics with real data

Work through these in order. Each step says where it happens and how to check it before moving on. Steps in Google Analytics and the CloudCannon authentication setting happen in a browser. The others also have a command-line form.

You need:

- the Netlify site and the CloudCannon site from [Setup](#setup) steps 3 and 4
- a Google account that can create a Google Analytics property
- a Google Cloud project, or permission to create one. It doesn't need billing.
- optionally the `netlify` and `gcloud` CLIs, signed in, for steps 3 and 4 below

Values you'll collect along the way:

- **Measurement ID:** `G-XXXXXXXXXX`, for tracking. Goes on Netlify as `GA_MEASUREMENT_ID`.
- **Property ID:** a plain number such as `412345678`, for reading. Goes on CloudCannon as `GA_PROPERTY_ID`.
- **Service account key:** a JSON file with a private key. Goes on CloudCannon as `GA_CREDENTIALS`.

The two IDs are easy to mix up. The measurement ID sends data in and is public. The property ID, with the key, reads data out.

#### 1. Lock the CloudCannon site

In CloudCannon, go to **Site Settings > Authentication** and choose **CloudCannon** or **Password**. The editor build has its own public URL, and once real data loads, the dashboard and `pages.json` are served from it. The Visual Editor keeps working behind authentication.

Check: open the CloudCannon site's URL (`*.cloudvent.net`) in a private window. It asks you to sign in.

#### 2. Create the GA4 property

In [Google Analytics](https://analytics.google.com):

1. Go to **Admin > Create > Property**, and create it in an existing account or a new one.
2. Add a **Web** data stream for the Netlify URL, with **Enhanced measurement** left on.
3. Copy the **measurement ID** from the data stream.
4. Copy the **property ID** from **Admin > Property details**.
5. Under **Admin > Data collection**, leave **Google signals** off. With it on, GA hides small numbers in reports, which leaves gaps on a low-traffic store.

The template reads only dimensions and metrics GA4 collects by default, so the property needs no custom events or dimensions.

#### 3. Track the live site

Set `GA_MEASUREMENT_ID` on Netlify only, under **Site configuration > Environment variables**, then trigger a deploy. With the Netlify CLI, from a folder linked to the site:

```sh
netlify env:set GA_MEASUREMENT_ID G-XXXXXXXXXX
```

Check:

- the live site's page source contains `googletagmanager.com/gtag/js?id=G-`
- a visit to the live site in a normal tab shows under **Reports > Realtime** in GA within a minute or so

The snippet skips the Visual Editor, so editors' previews don't count as visits. Never set the measurement ID on CloudCannon: any page carrying it reports to the property, and the build fails if it's set alongside `ANALYTICS_ENABLED`.

#### 4. Create a service account for the build

The CloudCannon build reads GA as a Google Cloud service account.

In the [Google Cloud console](https://console.cloud.google.com), with the project selected:

1. Under **APIs & Services > Library**, enable the **Google Analytics Data API**.
2. Under **IAM & Admin > Service Accounts**, create a service account, for example `analytics-reader`. Skip the optional step that grants it access to the project.
3. Open it, go to **Keys > Add key > Create new key > JSON**, and save the file outside this repository.
4. Copy its email address, `<name>@<project>.iam.gserviceaccount.com`.

With `gcloud`, replacing `<project>`:

```sh
gcloud services enable analyticsdata.googleapis.com --project <project>
gcloud iam service-accounts create analytics-reader --project <project>
gcloud iam service-accounts keys create ~/Downloads/analytics-reader.json \
  --iam-account analytics-reader@<project>.iam.gserviceaccount.com
```

If creating the key fails with an organisation policy error, the Google Cloud organisation blocks service account keys. Ask an organisation admin to allow them for this project, or use a project outside the organisation.

The key file is a password. Never commit it, paste it into chat, or put it on the command line where shell history keeps it. Keep it in a password manager, or delete it once it's in CloudCannon. If it leaks, delete it under the service account's **Keys** tab and create a new one.

#### 5. Give the service account read access in GA

In Google Analytics, go to **Admin > Property access management > + > Add users**. Paste the service account's email, choose the **Viewer** role, and untick the email notification. Viewer access means a leaked key can read this one property but not change it.

#### 6. Point the CloudCannon build at GA

Base64-encode the key so it fits on one line:

```sh
base64 -i ~/Downloads/analytics-reader.json | pbcopy
```

On the CloudCannon site, under **Site Settings > Builds**, add these next to `PUBLIC_EDITOR_BUILD`, then rebuild:

- `ANALYTICS_ENABLED`: `true`
- `GA_PROPERTY_ID`: the numeric property ID
- `GA_CREDENTIALS`: the base64 key. Raw JSON also works.

Enter `GA_CREDENTIALS` in the dashboard. The CLI's `sites update-build-config` would put the key in shell history, and it replaces the whole build configuration: any of the install command, build command, output path or Node version left out of the call is dropped. For the two non-secret variables, read the current settings first with `npx @cloudcannon/cli sites get --site <site>` and pass them all back, ending `--environment-variables` with `...` to keep the existing variables.

Check:

- `npx @cloudcannon/cli sites print-last-build --site <site>` shows the `/analytics/` routes and no `[analytics] GA_PROPERTY_ID or GA_CREDENTIALS not set, using mock data` line
- **Insights > Analytics** shows real numbers and no **Mock data** badge
- a product page opened in the Visual Editor shows the pop-up in the bottom-left corner

A new property has no data for 24–48 hours, so the dashboard shows zeros until then. Rebuild a day later.

#### Keep each variable on its own host

- **Netlify:** `GA_MEASUREMENT_ID` only.
- **CloudCannon:** `ANALYTICS_ENABLED`, `GA_PROPERTY_ID` and `GA_CREDENTIALS` only.

A CloudCannon site copies its environment variables when branched or duplicated. Check a new site has only the variables for its role.

The numbers refresh only when CloudCannon builds, which happens on every save. Each build makes six GA4 Data API requests. Standard GA4 and the Data API are free, with daily request quotas per property instead of billing.

## Store dashboard (demo)

A sketch of running the day-to-day side of the shop from CloudCannon: a simplified dashboard designed for this store, beside the content it sells with. It runs on sample data and never contacts Shopify. Going live needs a CloudCannon feature that doesn't exist yet: a way for pages in the Visual Editor to call an API with a secret the browser never sees.

- **Dashboard:** **Shop > Store** opens `/store/`, with four views:
  - **Today:** sales today and over 7 days, orders to ship, products running low, a 28-day sales trend and best sellers. Each low-stock product has an **Add 20** button.
  - **Products:** price, stock and status (on sale or hidden) for every product, edited in place, with a link to each product's page content.
  - **Orders:** orders waiting to ship, each with **Mark shipped**, and recent orders.
  - **Content that sells:** each Journal post with 28-day sales of the products it links to in `shop.products`.
- **Pop-up:** product pages in the Visual Editor show a store pop-up in the bottom-right corner, with that product's price, stock and status to edit, and its sales over the last 7 and 28 days. Editors change the copy and the price on one screen.

### Try it

Set `STORE_DEMO=true` on the CloudCannon site under **Site Settings > Builds**, next to `PUBLIC_EDITOR_BUILD`, and rebuild. Locally:

```sh
PUBLIC_EDITOR_BUILD=true STORE_DEMO=true npm run dev
```

The build fails if `STORE_DEMO` is set without `PUBLIC_EDITOR_BUILD`, so the dashboard never reaches the live site. Edits are kept in the browser's local storage; **Reset demo** clears them.

### The sample data

Products, handles, images and prices come from the synced catalog in `src/data/shopify/products.json`, so the demo shows the store the site is connected to. The development store behind this template was seeded from `coffee.mock.shop` with `npm run catalog:csv` (see [Use your own Shopify store](#5-use-your-own-shopify-store)), so it has the same 8 products and handles, and a new store set up the same way does too. Stock, orders and sales are generated from a fixed seed, with dates counted back from today. The two best sellers start with 3 and 4 in stock so **Running low** has something in it.

### Wiring it to Shopify

This is the brief for connecting the demo to a real store once CloudCannon can hold a secret for the Visual Editor.

**What the feature must provide.** The Shopify Admin API token can change products and read customer details, so it must never reach the browser. The editor build serves its pages to the browser, so a `PUBLIC_*` variable doesn't work, and nor does a build-time `astro:env` secret, which is only readable at build time. The dashboard needs a request-time call from the editor page that CloudCannon signs with the token on the server, limited to people who can edit the site. Until then, reads alone could move to build time the way analytics does, as a snapshot refreshed on every save. Writes can't.

**Where the code changes.** The dashboard and pop-up use only the functions in `src/lib/store-demo/store.ts`. Replace each body with an Admin GraphQL call through the CloudCannon feature, keep the signatures, then delete `mock.ts`, the **Reset demo** button, the demo note on `/store/` and the **Demo data** badge in the pop-up, and rename the folder and `STORE_DEMO`.

| Function | Admin GraphQL |
| --- | --- |
| `listProducts` | `products` query: `handle`, `title`, `status`, `featuredMedia`, `totalInventory`, and variants with `price`, `inventoryQuantity` and `inventoryItem { id }` |
| `updateProduct` (price) | `productVariantsBulkUpdate`, with each variant's `id` and `price` |
| `updateProduct` (status) | `productUpdate`, with `status: ACTIVE` or `DRAFT` |
| `setStock` | `inventorySetQuantities` on the `available` quantity, with the variant's `inventoryItem` id and the store's location id (from `locations`) |
| `listOrders` | `orders` query, newest first: `name`, `createdAt`, `displayFulfillmentStatus`, `totalPriceSet`, `lineItems`, the customer's name and the shipping address city |
| `markShipped` | the order's `fulfillmentOrders`, then `fulfillmentCreate` for each open one |
| `getOverview`, `getSalesByProduct`, `getProductStats` | totals over 28 days of orders. For a busier store, check whether ShopifyQL through the Admin API fits better than paging through orders. |

Check each mutation's input shape against the API version in `PUBLIC_SHOPIFY_API_VERSION` before relying on this table: Shopify reshapes inputs between versions.

**The custom app's scopes:** `read_products`, `write_products`, `read_inventory`, `write_inventory`, `read_locations`, `read_orders`, `read_merchant_managed_fulfillment_orders` and `write_merchant_managed_fulfillment_orders`. Customer names on orders also need protected customer data access, which a custom app on a development store can turn on in its settings.

**Decisions to make with the site owner:**

- **Variants.** The demo treats each product as one price and one stock level. The sample products have variants (finish, capacity), so choose between editing each variant and setting all of a product's variants at once.
- **Who can change the store.** Everyone who can edit the site gets the token's full access. Decide whether that's acceptable or the feature needs to limit live changes by role.
- **Hidden products.** A draft product leaves the Storefront API, so the next `npm run sync:shopify` lists its page file as no longer in Shopify, and the product pickers drop it. Decide whether **Hidden** should mean draft, or unpublished from the Headless channel, which hides it from the site but not from Shopify admin.
- **Prices in the editor.** Pages in the editor build show prices from the last build, so a new price shows on the live site within a minute but not on the editor's copy of the page until it rebuilds.

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
- `src/lib/analytics.ts`: fetches the GA4 report at build time, or generates mock data for every built page.
- `src/pages/analytics/`: the `/analytics/` dashboard and `/analytics/pages.json`.
- `src/scripts/analytics-panel.ts`: the editor-only per-page pop-up, styled inside a shadow root.
- `analytics/index.md`: the stub file behind **Insights > Analytics** in CloudCannon.
- `src/lib/store-demo/store.ts`: every read and write the store dashboard and its pop-up make. `mock.ts` beside it supplies the sample data, and `enabled.ts` holds the build guard.
- `src/pages/store/[...path].astro` and `src/scripts/store-dashboard.ts`: the `/store/` dashboard, rendered in the browser.
- `src/scripts/store-panel.ts`: the editor-only store pop-up on product pages.
- `store/index.md`: the stub file behind **Shop > Store** in CloudCannon.

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
- **Insights > Analytics shows "No Preview Available", or there's no pop-up:** `ANALYTICS_ENABLED` isn't set on the CloudCannon site. The preview's console logs `[analytics] /analytics/pages.json returned 404; this build has no analytics`.
- **The dashboard shows "Mock data":** `GA_PROPERTY_ID` or `GA_CREDENTIALS` is missing on the CloudCannon site.
- **The build fails with `GA4 request failed: gRPC 7`:** the service account isn't a Viewer on the property, or `GA_PROPERTY_ID` holds the `G-` measurement ID.
- **The build fails with `GA_CREDENTIALS is not valid service account JSON` or `is missing client_email or private_key`:** the key was cut short or changed when pasted. Copy the base64 output again in full.
- **The build fails with a `GA4 request failed` message saying the API is disabled or hasn't been used:** enable the Google Analytics Data API in the service account's Google Cloud project.
- **The build fails with `the Google client failed before reaching the API`:** the key parsed, but signing in failed. Usually the key was deleted or isn't valid; a network failure during the build gives the same message. Rebuild once, then create a new key if it persists. The log leaves out the underlying error because it can quote the key.
- **The build fails with `ANALYTICS_ENABLED needs PUBLIC_EDITOR_BUILD` or `ANALYTICS_ENABLED and GA_MEASUREMENT_ID are both set`:** a host has the other host's variables. See [Keep each variable on its own host](#keep-each-variable-on-its-own-host).
- **The dashboard shows zeros:** the property is less than two days old, or Netlify has no `GA_MEASUREMENT_ID`. Check **Reports > Realtime** in GA, then rebuild CloudCannon a day later.

## Is this setup right for your store?

It suits brand-led stores with a modest catalog, where editors care about the pages around the products. For very large or fast-changing catalogs, deep customer accounts, B2B or subscriptions, read [Shopify on CloudCannon](https://github.com/tomrcc/shopify-cloudcannon) first. It compares this setup with Liquid themes, Hydrogen and a hybrid of the two.
