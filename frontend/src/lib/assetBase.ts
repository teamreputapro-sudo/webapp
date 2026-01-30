export const withBase = (path: string): string => {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const trimmed = path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedBase}${trimmed}`;
};
