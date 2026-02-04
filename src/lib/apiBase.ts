const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const ensureLeadingSlash = (value: string): string => (value.startsWith('/') ? value : `/${value}`);

export const getApiBaseUrl = (): string => {
  const envBase =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = envBase || origin;
  return trimTrailingSlash(base);
};

export const buildApiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  const normalizedPath = ensureLeadingSlash(path);
  return `${base}${normalizedPath}`;
};
