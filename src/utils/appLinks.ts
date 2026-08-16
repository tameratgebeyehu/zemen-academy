export type AppLinkDestination = 'HelpCenter' | 'PrivacyCenter';

const OFFICIAL_HOST = 'zemenacademy.com';

export function appLinkDestination(url: string): AppLinkDestination | null {
  try {
    const parsed = new URL(url);
    const isOfficialWebLink = (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:')
      && parsed.hostname.toLowerCase() === OFFICIAL_HOST
    );
    const isCustomScheme = parsed.protocol === 'zemenacademy:';
    if (!isOfficialWebLink && !isCustomScheme) return null;

    const customSchemePath = isCustomScheme && parsed.hostname
      ? '/' + parsed.hostname + parsed.pathname
      : parsed.pathname;
    const routedPath = isOfficialWebLink
      ? (customSchemePath.startsWith('/app/') ? customSchemePath.slice('/app'.length) : '')
      : customSchemePath;
    const path = routedPath.replace(/\/+$/, '') || '/';

    if (path === '/help') return 'HelpCenter';
    if (path === '/privacy' || path === '/terms' || path === '/account-deletion') {
      return 'PrivacyCenter';
    }
    return null;
  } catch {
    return null;
  }
}
