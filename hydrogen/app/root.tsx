import {
  Analytics,
  getShopAnalytics,
  useNonce,
  type I18nBase,
} from '@shopify/hydrogen';
import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
  data,
  redirect,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
  useLocation,
  useNavigate,
} from 'react-router';
import type {Route} from './+types/root';
import favicon from '~/assets/favicon.svg';
import {FOOTER_QUERY, HEADER_QUERY} from '~/lib/fragments';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';
import tailwindCss from './styles/tailwind.css?url';
import {PageLayout} from './components/PageLayout';
import {
  parseLocale,
  shouldPrefixLocale,
  withLocale,
} from '~/lib/locale';
import {useEffect} from 'react';

export type RootLoader = typeof loader;

/**
 * This is important to avoid re-fetching root queries on sub-navigations
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') return true;

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;

  const currentLocale = parseLocale(currentUrl.pathname);
  const nextLocale = parseLocale(nextUrl.pathname);
  if (
    currentLocale?.language !== nextLocale?.language ||
    currentLocale?.country !== nextLocale?.country
  ) {
    return true;
  }

  // Defaulting to no revalidation for root loader data to improve performance.
  // When using this feature, you risk your UI getting out of sync with your server.
  // Use with caution. If you are uncomfortable with this optimization, update the
  // line below to `return defaultShouldRevalidate` instead.
  // For more details see: https://remix.run/docs/en/main/route/should-revalidate
  return false;
};

/**
 * The main and reset stylesheets are added in the Layout component
 * to prevent a bug in development HMR updates.
 *
 * This avoids the "failed to execute 'insertBefore' on 'Node'" error
 * that occurs after editing and navigating to another page.
 *
 * It's a temporary fix until the issue is resolved.
 * https://github.com/remix-run/remix/issues/9242
 */
export function links() {
  return [
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
  ];
}

export async function loader(args: Route.LoaderArgs) {
  const url = new URL(args.request.url);
  const pathLocale = parseLocale(url.pathname);
  const headers = new Headers();

  if (
    !pathLocale &&
    args.request.headers.get('Sec-Fetch-Dest') !== 'empty' &&
    shouldPrefixLocale(url.pathname)
  ) {
    return redirect(
      withLocale(`${url.pathname}${url.search}`, {
        language: args.context.storefront.i18n.language,
        country: args.context.storefront.i18n.country,
      }),
    );
  }

  if (pathLocale) {
    const {session, cart} = args.context;
    const countryChanged = session.get('country') !== pathLocale.country;
    if (
      countryChanged ||
      session.get('language') !== pathLocale.language
    ) {
      session.set('country', pathLocale.country);
      session.set('language', pathLocale.language);
      headers.append('Set-Cookie', await session.commit());
    }
    if (countryChanged) {
      try {
        const result = await cart.updateBuyerIdentity({
          countryCode: pathLocale.country as I18nBase['country'],
        });
        const cartHeaders = result.cart?.id
          ? cart.setCartId(result.cart.id)
          : new Headers();
        cartHeaders.forEach((value, key) => {
          headers.append(key, value);
        });
      } catch (error) {
        console.error(error);
      }
    }
  }

  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  const {storefront, env} = args.context;

  const payload = {
    ...deferredData,
    ...criticalData,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    country: args.context.storefront.i18n.country,
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: false,
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
  };

  return headers.has('Set-Cookie') ? data(payload, {headers}) : payload;
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const {storefront} = context;

  const [header] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'main-menu', // Adjust to your header menu handle
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {header};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  const {storefront, customerAccount, cart} = context;

  // defer the footer query (below the fold)
  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'footer', // Adjust to your footer menu handle
      },
    })
    .catch((error: Error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });
  const countries = storefront
    .query(COUNTRIES_QUERY)
    .then(
      (data: {
        localization: {
          availableCountries: Array<{
            isoCode: string;
            name: string;
            currency: {isoCode: string};
          }>;
        };
      }) => data.localization.availableCountries,
    )
    .catch((error: Error) => {
      console.error(error);
      return [];
    });

  return {
    cart: cart.get(),
    isLoggedIn: customerAccount.isLoggedIn(),
    footer,
    countries,
  };
}

const COUNTRIES_QUERY = `#graphql
  query Countries($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    localization {
      availableCountries {
        isoCode
        name
        currency {
          isoCode
        }
      }
    }
  }
` as const;

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();
  const data = useRouteLoaderData<RootLoader>('root');
  const lang = data
    ? `${data.consent.language}-${data.country}`.toLowerCase()
    : 'en';

  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href={tailwindCss}></link>
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={appStyles}></link>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

function LocaleRedirect({
  language,
  country,
}: {
  language: string;
  country: string;
}) {
  const {pathname, search, hash} = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!shouldPrefixLocale(pathname)) return;
    navigate(withLocale(`${pathname}${search}${hash}`, {language, country}), {
      replace: true,
    });
  }, [pathname, search, hash, language, country, navigate]);

  return null;
}

export default function App() {
  const data = useRouteLoaderData<RootLoader>('root');

  if (!data) {
    return <Outlet />;
  }

  return (
    <Analytics.Provider
      cart={data.cart}
      shop={data.shop}
      consent={data.consent}
    >
      <PageLayout {...data}>
        <LocaleRedirect
          language={data.consent.language}
          country={data.country}
        />
        <Outlet />
      </PageLayout>
    </Analytics.Provider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorMessage = 'Unknown error';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="route-error">
      <h1>Oops</h1>
      <h2>{errorStatus}</h2>
      {errorMessage && (
        <fieldset>
          <pre>{errorMessage}</pre>
        </fieldset>
      )}
    </div>
  );
}
