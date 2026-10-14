---
title: "Locales, Currencies, and Languages"
---

# Set up locales, currencies, and languages

Do these in order in the Shopify admin. A locale is a language in a country, such as French in Canada. The country is a market, the language is published in Settings, and the currency is set on that market. A different price per currency is a catalog on that market.

Shopify Payments or Adyen has to be the card processor. Any other processor, including the Test payment gateway on a development store, still shows converted prices, then charges every country in the store currency from **Settings > General**. [Setting up currencies for markets](https://help.shopify.com/en/manual/markets/customizations/local-currencies): "To process payments in multiple currencies, your store must use Shopify Payments or Adyen as its payment processor. If you use a different provider, then customers in all markets pay in your store's default currency."

## Languages

Shopify Plus and Shopify Enterprise Commerce can publish up to 30 languages on one store, including during a Plus trial. Basic, Grow, Shopify, and Advanced stop at 20. [Localization and translation](https://help.shopify.com/en/manual/international/localization-and-translation).

1. Go to **Settings > Languages > Add language**.
2. Select the language. If the store already has country URLs, choose which markets get this language, then click **Done**.
3. Under **Unpublished languages**, open the menu and click **Publish**.
4. Open **Translate & Adapt** and translate products, collections, pages, menus, and policies. A CSV import from **Settings > Languages** does the same job.
5. Checkout already has translations for 33 languages. To change the default checkout wording, go to **Settings > Checkout > Checkout language > Edit checkout content**. Translate that wording for each added language in Translate & Adapt.
6. For order emails, go to **Settings > Notifications**, open the email, and click **Localize**.

Publishing a language translates the theme and checkout where Shopify has a translation. Product titles and descriptions stay in the store's primary language until you translate them.

## Regions

1. Go to **Markets**. The domestic market is the store's home country. Leave the suggested international market inactive until it has shipping rates.
2. Click **Create market**. Name it and set the status to **Draft**.
3. Under **Includes**, click **Add condition > Regions** and select the countries. One country gets its own currency and prices. A group of countries shares them unless you add a submarket later.
4. Click **Save**.
5. Go to **Settings > Shipping and delivery** and add a rate for every country in the market. Checkout cannot be completed for a country with no rate.
6. Open the market again. Next to **Domain / language**, click the plus.
7. Choose **Subfolder** (`yourstore.com/fr/`) unless the store already owns a country domain. Select the language, click **Done**, then **Save**.
8. To make that language the one customers land on, open **Languages and domains**, open the menu beside the language, and click **Set as default**.
9. Switch the market from **Draft** to **Active** and click **Save**.

Without a subfolder, subdomain, or domain, every market shares one language list.

## Currencies

1. Open the market and click the plus next to **Currency**.
2. Select the currency. A one-country market already suggests the local currency, such as EUR for Germany.
3. Choose **Dynamic** to convert the store price at the current rate. The conversion fee is inside the price the customer sees.
4. Choose **Manual** to lock the rate. The customer pays that converted price. The fee comes out of the payout.
5. Turn on **Rounding** to land on a clean amount, such as €10.00 instead of €9.73.
6. Click **Done**, then **Save**.

### Conversion fees

Shopify charges this fee when the customer pays in a currency other than the Shopify Payments payout currency. It applies to each transaction and covers converting that payment into the payout currency. The rate depends on the store location.

| Store location | Conversion fee |
| --- | --- |
| United States | 1.5% |
| United Kingdom, European Economic Area, Canada, Australia, New Zealand, and other regions | 2% |

With a dynamic rate, the fee is already in the price the customer sees. With a manual rate, it is taken out of the payout instead.

A market with several countries turns **Local currencies** on, so each country converts into its own currency. Turn it off when every country in that market should see one currency.

This converts one store price. It does not let you type a different price for a currency. Use a catalog for that.

## Different prices per currency

Create one catalog per currency. Set the catalog currency to the same currency as the market. A typed price in that catalog is what the customer pays. Shopify does not convert it again.

### In the admin

1. Go to **Markets > Catalogs > Create catalog**.
2. Name it for the currency, such as `Canada CAD`. Set it to **Active**.
3. Click **Add a market** and choose the market that uses this currency.
4. Under **Set prices in**, select that same currency.
5. To raise or lower every product by the same percent, enter it in **Price adjustment**. Leave this empty if each product gets its own price.
6. In the product list, open the product and type the **Price** and **Compare-at price** on each variant. A typed price replaces the percent adjustment for that variant.
7. Clear a product and click **Exclude from catalog** to hide it in this market.
8. Click **Save**.
9. Open the market, click the plus next to **Catalogs**, select this catalog, click **Done**, then **Save**.

### With a CSV

1. Create the catalog first, assign the market, and set **Set prices in** to that currency.
2. On **Markets > Catalogs**, select the catalog and click **Export** if you want Shopify's file as a starting point.
3. Fill **Fixed Price** as a number with no currency symbol. Use **SKU** for each variant. **Catalog Title** must match the catalog name. Set **Published** to `TRUE`.
4. On **Markets > Catalogs**, click **Import**, then **Adjust prices > Import CSV**.

Columns are Catalog Title, SKU, Handle, Fixed Price, Compare At, and Published. A sample file and the column list are in [Creating catalogs for markets](https://help.shopify.com/en/manual/markets/customizations/catalogs). The sample CSV is [catalogs_sample.csv](https://help.shopify.com/csv/catalogs_sample.csv).

Check it from **Products > View as** and choose the market. The price column shows that currency. Open a price to see whether it is a typed catalog price or a conversion.

## Checkout

1. Go to **Online Store > Preferences**. Under **Automatic redirection**, turn on **Country/region**. Turn on **Language** when a market has more than one language.
2. In the theme editor, turn on the country selector and the language selector in the header or footer.
3. Open the market URL. The product price is the catalog price in that currency.
4. Continue to checkout. The language matches the storefront. The charged currency matches the market when Shopify Payments or Adyen is the processor. Otherwise the charge stays in the store currency.
5. Enter a shipping address in another active market. Checkout switches to that market's currency and catalog price.

Customers who match no active market get the backup region, which starts as the store's home country.
