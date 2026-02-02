const normalizeBase = (baseUrl: string): string => {
  if (!baseUrl) return '/';
  const withSlash = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return withSlash;
};

const baseUrl = normalizeBase(import.meta.env.BASE_URL || '/');

export const isScannerMode = (): boolean => baseUrl.startsWith('/scanner/');

export const getRouterBase = (): string => {
  if (baseUrl === '/') return '/';
  return baseUrl.replace(/\/$/, '');
};

export const getScannerPath = (): string => (isScannerMode() ? '/' : '/scanner');
export const getLandingPath = (): string => (isScannerMode() ? '/home' : '/');
export const getMainPaths = (): string[] =>
  isScannerMode() ? ['/', '/chart', '/insights'] : ['/scanner', '/chart', '/insights'];

export const getScannerDetailRoute = (): string =>
  isScannerMode() ? '/s/:symbol' : '/scanner/s/:symbol';

export const getScannerDetailPath = (symbol: string): string => {
  const base = isScannerMode() ? '/s' : '/scanner/s';
  return `${base}/${encodeURIComponent(symbol)}`;
};
