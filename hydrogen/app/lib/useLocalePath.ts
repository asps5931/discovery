import {useLocation} from 'react-router';
import {parseLocale, withLocale} from '~/lib/locale';

/** Prefix an in-app path with the locale already in the URL. */
export function useLocalePath() {
  const {pathname} = useLocation();
  const locale = parseLocale(pathname);
  return (to: string) =>
    locale && to.startsWith('/') && !to.startsWith('//')
      ? withLocale(to, locale)
      : to;
}
