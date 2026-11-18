import type { APIRoute } from 'astro';
import { getAnalyticsReport, isAnalyticsEnabled } from '../../lib/analytics';

// /analytics/pages.json feeds the editor pop-up. Builds without analytics have no file.
export function getStaticPaths() {
	return isAnalyticsEnabled() ? [{ params: { file: 'pages' } }] : [];
}

export const GET: APIRoute = async () => {
	const { generatedAt, source, range, pages } = await getAnalyticsReport();
	return new Response(JSON.stringify({ generatedAt, source, range, pages }), {
		headers: { 'Content-Type': 'application/json' },
	});
};
