---
title: "Features"
order: 0
---

{
  "headers": [
    "ID",
    "Feature",
    "Category",
    "Notes",
    "Shopify"
  ],
  "rows": [
    [
      "COMM-13",
      "Image URL",
      "Catalog",
      "Full image URLs must be set at product level. SFCC allows relative URLs.",
      "Option 1: Store relative paths on product metafield <b>media_gallery</b> (prefer list.single_line_text_field; comma delimited single_line_text_field also works). Storefront prepends CDN base.<br><br>Option 2: Absolute HTTPS URLs set in native <b>Image Src </b>/ product media. Shopify copies to its CDN (Shopify CDN compatibility)."
    ],
    [
      "COMM-14",
      "PDP URL",
      "Catalog",
      "No site-level URL pattern. Pattern is maintained at product level only.",
      "Option 1: Native <b>Handle</b> field when public URL is /products/{slug} (e.g. /products/tabby-bag).<br><br>Option 2: Product metafield <b>pdp_url</b> when public URL is not /products/{slug} (e.g. /bags/shoulder/tabby-26)."
    ],
    [
      "COMM-15",
      "Admin API rate limits",
      "Platform",
      "1000 points per second.",
      "<b>1000 points/second</b> on non-bulk GraphQL Admin API (Shopify Plus). Might not be needed for initial implementation. Use bulk operations instead."
    ],
    [
      "COMM-16",
      "Bulk Product Update API limits",
      "Catalog",
      "Max size 100 MB. Must complete within 24 hours. Separate request for Product and Variants.",
      "Up to <b>5 concurrent</b> bulk jobs. Max 100 MB. Separate product and variant mutations.<br><br>POC: create 10k products ~17 min; 10k SKUs (5 colors) ~3 min; inventory ~2.5 min; titles ~7 min; prices ~4.5 min.<br><br>Jobs fail if not completed within 24 hours."
    ],
    [
      "COMM-17",
      "File Import Process",
      "Catalog",
      "Need Matrixify or custom middleware. Matrixify uses Shopify APIs under the hood and may contend with other API traffic. Custom path: read CSV and import via Shopify GraphQL.",
      "Option 1: <b>Matrixify</b>. Strict file format (e.g. CSV with required headers). Convert existing files into Matrixify-compatible templates. Files can be pulled via SFTP, HTTPS, etc. (scheduled/auto import).<br><br>Option 2: Custom Admin API integration. Push data directly to Shopify via API. No file required."
    ],
    [
      "COMM-18",
      "Custom attribute / metafield limits",
      "Catalog",
      "256 metafields per resource (e.g. 256 on Product and 256 on Variant).",
      "Product and Variant are separate resource types, both limited to <b>256</b> metafield definitions."
    ],
    [
      "COMM-19",
      "Product structure (3 levels)",
      "Catalog",
      "Product → Product Options → Product Variant.",
      "Native Shopify model.<br><br>1. <b>Product</b>: parent (title, description, handle, etc.)<br>2. <b>Options</b>: dimensions like Size / Color (up to 3 option names)<br>3. <b>Variants</b>: each sellable combo (SKU, price, inventory)"
    ],
    [
      "COMM-20",
      "Staging to Production replication",
      "Environments",
      "No deployments / replication between Staging and Production.",
      "Custom Shopify app that promotes data from staging to production. Select which resources to promote. Resource specific pushes. Resource snapshots before promote for rollback. Scheduled promotion / scheduled pushes.<br><br>Note: Matrixify can be used for standardized resource exports."
    ],
    [
      "COMM-21",
      "Payment Providers",
      "Payments",
      "Adyen, PayPal, Amazon Pay, Klarna, Afterpay, Paidy, Shop Pay — all supported.",
      "Supported. Confirm accounts and complete setup in Shopify per provider. Setup type varies (Shopify under the hood vs separate app/gateway)."
    ],
    [
      "COMM-22",
      "Fraud",
      "Payments",
      "Forter app available.",
      "Forter app: https://apps.shopify.com/forter "
    ],
    [
      "COMM-23",
      "Loqate",
      "Checkout",
      "Available as an app.",
      "Loqate app: https://apps.shopify.com/loqate"
    ],
    [
      "COMM-24",
      "Cordial",
      "Marketing",
      "Available as an app for SMS and Email.",
      "Cordial app: https://apps.shopify.com/cordial"
    ],
    [
      "COMM-25",
      "Promotions on PDP/PLP",
      "Promotions",
      "No API to list promotions applicable to a product.",
      "Confirmed: Shopify has no API to return promotions applicable to a product for PDP/PLP. A promotions engine would cover this (see COMM-26)."
    ],
    [
      "COMM-26",
      "Promotion Engine integration",
      "Promotions",
      "Candidates: Voucherify, Talon.One.",
      "Candidates with Shopify support:<br>Voucherify: https://docs.voucherify.io/integrations/shopify<br>Talon.One: https://docs.talon.one/docs/dev/technology-partners/shopify/integrate-with-shopify<br><br>Headless needs API integration (not App Store only):<br>1. Call the promo engine with product/cart/customer context<br>2. Render PDP/PLP badges from that response<br>3. Apply results at cart/checkout (Shopify Functions / discount codes / cart attributes, depending on vendor)"
    ],
    [
      "COMM-27",
      "Source Code",
      "Promotions",
      "Discount links available.",
      "1. Discount link: https://www.brand.com/products/tabby-bag?discount=SPRING20 (param name can be modified)<br>2. Storefront reads discount and keeps it for the session<br>3. Create/get cart<br>4. Set discount with cartDiscountCodesUpdate [&quot;SPRING20&quot;]<br>5. Customer checks out with SPRING20 already applied. Discounted total.<br><br>Note: process may slightly vary if a third party promotions engine is used."
    ],
    [
      "COMM-28",
      "Promotion Ranking",
      "Promotions",
      "Promotion ranking not available for stackable promotions.",
      "No full promotion ranking for stackable promos. Shopify uses combination rules and limited automatic discount priority. Ranking needs a promotions engine (see COMM-26)."
    ],
    [
      "COMM-29",
      "Biometric login",
      "Admin",
      "Not available out of the box.",
      "Shopify supports <b>passkeys</b> for staff login. Device unlock (Face ID / Touch ID / Windows Hello / PIN) can protect the passkey. Biometrics stay on the device.<br><br>Plus org <b>SAML SSO</b> is separate (Okta, OneLogin, Microsoft Entra). Example: Microsoft Entra SSO for staff login."
    ],
    [
      "COMM-30",
      "Online from date",
      "Pricing",
      "No explicit online-from date. Shopify Flow may cover some customizations.",
      "No native online-from date field.<br><br>Option 1: Scheduled publish to a sales channel (future publish date).<br>Option 2: Shopify Flow or custom job publishes / makes available at a set time.<br>Option 3: Store the date on a product metafield and drive storefront logic from it.<br><br>Note: need a real life use case or example for clarity on solution."
    ],
    [
      "COMM-31",
      "Future Dated Price Changes",
      "Pricing",
      "Not available natively. Needs a custom solution: store schedule outside Shopify; at go-live, update price via Admin GraphQL.",
      "Store from date, to date, and price change value on product/variant metafields.<br><br>Option 1: Middleware updates variant price via Admin API when the window starts (and reverts when it ends, if desired).<br>Option 2: Shopify Flow scheduled trigger polls for due items, then Send Admin API request runs productVariantsBulkUpdate. Better for smaller catalogs."
    ],
    [
      "COMM-32",
      "Preview Toolkit",
      "Pricing",
      "Missing — Shopify does not store future-dated price or product state for preview.",
      "Custom Admin product block/action. Click Preview. App backend generates a short-lived signed preview URL and returns it to Admin. Headless preview route validates the token and renders scheduled state."
    ],
    [
      "COMM-33",
      "Promotions start and end date",
      "Promotions",
      "Promotions have start and end dates.",
      "Native. Discounts use Active dates (startsAt / endsAt). End date optional.<br>https://help.shopify.com/en/manual/discounts/discount-types/percentage-fixed-amount<br>https://shopify.dev/docs/api/admin-graphql/latest/input-objects/DiscountCodeBasicInput"
    ],
    [
      "COMM-34",
      "Multiple coupon codes for a promotion",
      "Promotions",
      "Needs a paid app such as Syno Discount Code.",
      "Native supports this. <br><br>One discount, many redeem codes via discountRedeemCodeBulkAdd (max 250 per request; repeat to add more).<br>https://shopify.dev/docs/api/admin-graphql/latest/mutations/discountRedeemCodeBulkAdd"
    ]
  ],
  "columnWidths": [
    90,
    256.6197967529297,
    120,
    300,
    420
  ]
}
