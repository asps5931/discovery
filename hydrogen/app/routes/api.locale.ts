import {data, redirect, type ActionFunctionArgs} from 'react-router';
import {type I18nBase} from '@shopify/hydrogen';
import {parseLocale, withLocale, type StoreLocale} from '~/lib/locale';

export async function action({request, context}: ActionFunctionArgs) {
  const formData = await request.formData();
  if (formData.get('intent') !== 'country') {
    return data({ok: false}, {status: 400});
  }

  const country = String(formData.get('country') || '');
  if (!/^[A-Z]{2}$/.test(country)) {
    return data({ok: false}, {status: 400});
  }

  const {session, cart} = context as {
    session: {
      set: (key: string, value: string) => void;
      commit: () => Promise<string>;
    };
    cart: {
      updateBuyerIdentity: (input: {
        countryCode: I18nBase['country'];
      }) => Promise<{cart?: {id?: string} | null}>;
      setCartId: (id: string) => Headers;
    };
  };

  session.set('country', country);
  const headers = new Headers();
  headers.append('Set-Cookie', await session.commit());

  try {
    const result = await cart.updateBuyerIdentity({
      countryCode: country as I18nBase['country'],
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

  const returnTo = formData.get('returnTo');
  const path =
    typeof returnTo === 'string' &&
    returnTo.startsWith('/') &&
    !returnTo.startsWith('//')
      ? returnTo
      : '/';
  const current = parseLocale(path);
  const locale: StoreLocale = {
    language: current?.language ?? contextLanguage(context),
    country,
  };

  return redirect(withLocale(path, locale), {headers});
}

function contextLanguage(context: ActionFunctionArgs['context']) {
  const language = (
    context as {storefront?: {i18n?: {language?: string}}}
  ).storefront?.i18n?.language;
  return language && /^[A-Z]{2}$/.test(language) ? language : 'EN';
}
