import { STORE_DEMO } from 'astro:env/server';
import { editorBuild } from '../editor-build';

export function isStoreDemoEnabled(): boolean {
	if (STORE_DEMO !== true) return false;
	// The production host serves pages with no login, so the store dashboard must never build there.
	if (!editorBuild) {
		throw new Error('[store] STORE_DEMO needs PUBLIC_EDITOR_BUILD. The store dashboard belongs on the CloudCannon editor build only.');
	}
	return true;
}
