export type StoreLocale = {language: string; country: string};

const SEGMENT = /^[a-z]{2}-[a-z]{2}$/i;

/** Paths that must stay unprefixed: crawlers, OAuth, and Hydrogen dev tools. */
const BARE =
  /^\/(robots\.txt$|sitemap(?:\.xml|\/)|account\/authorize|graphiql|subrequest-profiler|\.well-known\/)/;

export function parseLocale(pathname: string): StoreLocale | null {
  const segment = pathname.split('/').filter(Boolean)[0] ?? '';
  if (!SEGMENT.test(segment)) return null;
  const [language, country] = segment.toLowerCase().split('-');
  return {language: language.toUpperCase(), country: country.toUpperCase()};
}

export function stripLocale(pathname: string): string {
  let path = pathname || '/';
  if (parseLocale(path)) path = dropFirstSegment(path);
  const segment = path.split('/').filter(Boolean)[0] ?? '';
  // Shop menu URLs can already include a market folder such as /en-asia.
  if (/^[a-z]{2}-[a-z0-9]+$/i.test(segment)) path = dropFirstSegment(path);
  return path || '/';
}

function dropFirstSegment(pathname: string): string {
  const rest = pathname.replace(/^\/[^/]+/, '');
  return rest || '/';
}

export function withLocale(path: string, locale: StoreLocale): string {
  const hashAt = path.indexOf('#');
  const hash = hashAt >= 0 ? path.slice(hashAt) : '';
  const withoutHash = hashAt >= 0 ? path.slice(0, hashAt) : path;
  const queryAt = withoutHash.indexOf('?');
  const search = queryAt >= 0 ? withoutHash.slice(queryAt) : '';
  const pathname = queryAt >= 0 ? withoutHash.slice(0, queryAt) : withoutHash;
  const bare = stripLocale(pathname.startsWith('/') ? pathname : `/${pathname}`);
  const prefix = `/${locale.language}-${locale.country}`.toLowerCase();
  return `${bare === '/' ? prefix : `${prefix}${bare}`}${search}${hash}`;
}

export function shouldPrefixLocale(pathname: string): boolean {
  return !BARE.test(pathname) && !parseLocale(pathname);
}
