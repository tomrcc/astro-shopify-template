// Set on the CloudCannon build only. The Visual Editor's preview answers server requests
// with a 200 error page, so server-backed parts render as placeholders there instead.
export const editorBuild = import.meta.env.PUBLIC_EDITOR_BUILD === 'true';
