# Choosing a host

CloudCannon builds a static copy of this site for editing. Shoppers are served by a separate production host. This guide covers what that host needs to do and how the common choices compare.

## What the host does here

- **Builds on demand.** Each CloudCannon save is a git push, and each Shopify catalog change calls a build hook. The host needs git-triggered builds and a build hook URL that Shopify webhooks can POST to.
- **Serves static files from a CDN.** Almost every page is prerendered, so this is most of the traffic.
- **Runs one small function.** The `LivePrice` server island renders on request. It needs an Astro adapter and a function runtime.
- **Caches that function at the edge.** The island response is shared by every shopper, so a short CDN cache with stale-while-revalidate keeps Shopify calls to about one a minute per product. The host needs a CDN-only cache header and, ideally, purging by tag.
- **Optionally resizes images.** Product photos already come resized from Shopify's CDN. Marketing images from CloudCannon can use the host's image CDN through Astro's `<Image>`.

## Netlify (the default)

- **Build hooks:** yes, per site, in the build and deploy settings.
- **Caching:** `Netlify-CDN-Cache-Control` applies to Netlify's CDN only. `durable` shares a function response across all edge nodes, and `stale-while-revalidate` refreshes it in the background. `Netlify-Cache-Tag` labels responses so `purgeCache({ tags })` from `@netlify/functions` can clear one product.
- **Adapter:** `@astrojs/netlify`. The static output is `dist`.
- **Good fit when:** you want the fewest moving parts. Builds, functions, caching and purging all live in one dashboard.

`LivePrice.astro` sets Netlify's headers. A webhook that purges `product-<handle>` would update a price within seconds instead of a minute; the template leaves this out to stay small.

## Vercel

- **Build hooks:** yes (deploy hooks, per project).
- **Caching:** set `Vercel-CDN-Cache-Control` or `CDN-Cache-Control` in place of Netlify's header. The adapter's `isr` option caches on-demand pages after their first request, with an `expiration` and a bypass token for revalidation.
- **Adapter:** `@astrojs/vercel`. Set CloudCannon's output path to `.vercel/output/static`.
- **Good fit when:** the team already deploys there, or you plan to render product pages on demand (below), where ISR does the caching for you.

## Cloudflare

- **Build hooks:** Pages projects have deploy hooks. For Workers, check that Workers Builds offers one before committing to it.
- **Caching:** Workers run at the edge in every region. Cache function responses with standard `Cache-Control` and Cloudflare's cache rules, or the Workers Cache API. This is the model the [Owner.com rebuild](https://building.owner.com/project-speed) uses at scale.
- **Adapter:** `@astrojs/cloudflare`. Check the adapter's docs for where static output lands, and set CloudCannon's output path to match.
- **Good fit when:** traffic is high or global and cost matters. Workers are cheap per request, but the runtime isn't Node, so check any npm package the island imports.

## Elsewhere: AWS, containers, your own servers

Use `@astrojs/node` behind a CDN such as CloudFront. The static output is `dist/client`. You run and scale the server yourself and set up the build pipeline and webhook endpoint. Pick this when company policy requires your own cloud account.

## Switching hosts

1. Swap the adapter in `astro.config.mjs` and `package.json`.
2. In `src/components/server/LivePrice.astro`, swap `Netlify-CDN-Cache-Control` and `Netlify-Cache-Tag` for the host's equivalents.
3. Set CloudCannon's output path to the adapter's static output, and remove `netlify.toml`.
4. Recreate the Shopify webhooks against the new host's build hook.

## When to render product pages on demand

This template builds every product page ahead of time. It fetches 100 products per Shopify request, so a few thousand products need only a few dozen requests. The 29 mock.shop products build in about two seconds. Consider rendering product and collection pages on request instead when:

- the catalog runs to tens of thousands of products, or
- products change so often that webhooks would rebuild the site all day.

Then:

1. Mark the routes `export const prerender = false`.
2. Cache them on the CDN with stale-while-revalidate.
3. Have the Shopify webhooks purge the affected pages by tag instead of triggering builds.

This is the Owner.com model, and Vercel's ISR or Netlify's durable cache and tags handle it well.

Keep prerendering those routes in CloudCannon's editor build, since the Visual Editor can only open prerendered pages. An Astro integration can set `prerender` per route in the `astro:route:setup` hook, based on `PUBLIC_EDITOR_BUILD`.
