import {Suspense} from 'react';
import {Await, Form, NavLink, useLocation} from 'react-router';
import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';
import {useLocalePath} from '~/lib/useLocalePath';

type StoreCountry = {
  isoCode: string;
  name: string;
  currency: {isoCode: string};
};

interface FooterProps {
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  publicStoreDomain: string;
  country: string;
  countries: Promise<StoreCountry[]>;
}

export function Footer({
  footer: footerPromise,
  header,
  publicStoreDomain,
  country,
  countries,
}: FooterProps) {
  return (
    <footer className="footer">
      <Suspense>
        <Await resolve={footerPromise}>
          {(footer) =>
            footer?.menu && header.shop.primaryDomain?.url ? (
              <FooterMenu
                menu={footer.menu}
                primaryDomainUrl={header.shop.primaryDomain.url}
                publicStoreDomain={publicStoreDomain}
              />
            ) : null
          }
        </Await>
      </Suspense>
      <Suspense>
        <Await resolve={countries}>
          {(list) => <StoreSwitch country={country} countries={list} />}
        </Await>
      </Suspense>
    </footer>
  );
}

function StoreSwitch({
  country,
  countries,
}: {
  country: string;
  countries: StoreCountry[];
}) {
  const {pathname, search} = useLocation();

  return (
    <Form method="post" action="/api/locale" className="store-switch">
      <label>
        Store
        <select
          name="country"
          key={country}
          defaultValue={country}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {countries.map((item) => (
            <option key={item.isoCode} value={item.isoCode}>
              {item.name} {item.currency.isoCode}
            </option>
          ))}
        </select>
      </label>
      <input type="hidden" name="intent" value="country" />
      <input type="hidden" name="returnTo" value={`${pathname}${search}`} />
    </Form>
  );
}

function FooterMenu({
  menu,
  primaryDomainUrl,
  publicStoreDomain,
}: {
  menu: FooterQuery['menu'];
  primaryDomainUrl: FooterProps['header']['shop']['primaryDomain']['url'];
  publicStoreDomain: string;
}) {
  const localePath = useLocalePath();
  return (
    <nav className="footer-menu" role="navigation">
      {(menu || FALLBACK_FOOTER_MENU).items.map((item) => {
        if (!item.url) return null;
        // if the url is internal, we strip the domain
        const url =
          item.url.includes('myshopify.com') ||
          item.url.includes(publicStoreDomain) ||
          item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url;
        const isExternal = !url.startsWith('/');
        return isExternal ? (
          <a href={url} key={item.id} rel="noopener noreferrer" target="_blank">
            {item.title}
          </a>
        ) : (
          <NavLink
            end
            key={item.id}
            prefetch="intent"
            style={activeLinkStyle}
            to={localePath(url)}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

const FALLBACK_FOOTER_MENU = {
  id: 'gid://shopify/Menu/199655620664',
  items: [
    {
      id: 'gid://shopify/MenuItem/461633060920',
      resourceId: 'gid://shopify/ShopPolicy/23358046264',
      tags: [],
      title: 'Privacy Policy',
      type: 'SHOP_POLICY',
      url: '/policies/privacy-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633093688',
      resourceId: 'gid://shopify/ShopPolicy/23358013496',
      tags: [],
      title: 'Refund Policy',
      type: 'SHOP_POLICY',
      url: '/policies/refund-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633126456',
      resourceId: 'gid://shopify/ShopPolicy/23358111800',
      tags: [],
      title: 'Shipping Policy',
      type: 'SHOP_POLICY',
      url: '/policies/shipping-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633159224',
      resourceId: 'gid://shopify/ShopPolicy/23358079032',
      tags: [],
      title: 'Terms of Service',
      type: 'SHOP_POLICY',
      url: '/policies/terms-of-service',
      items: [],
    },
  ],
};

function activeLinkStyle({
  isActive,
  isPending,
}: {
  isActive: boolean;
  isPending: boolean;
}) {
  return {
    fontWeight: isActive ? 'bold' : undefined,
    color: isPending ? 'grey' : 'white',
  };
}
