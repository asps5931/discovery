---
title: "Potential Functionality"
order: 1
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
      "COMM-35",
      "Coach vs Coach Outlet site switcher",
      "Site Switcher",
      "Header control to switch between Coach and Coach Outlet sites.",
      ""
    ],
    [
      "COMM-36",
      "Locale / country selector",
      "Localization",
      "Locale / country selection in the site header.",
      ""
    ],
    [
      "COMM-37",
      "Store locator",
      "Store Locator",
      "Find stores from the site header.",
      ""
    ],
    [
      "COMM-38",
      "Global search",
      "Search",
      "Site-wide search in the header.",
      ""
    ],
    [
      "COMM-39",
      "Wishlist",
      "Wishlist",
      "• Header wishlist entry<br>• Add from PDP (including wishlist control on media)<br>• Guest wishlist (save without login)",
      ""
    ],
    [
      "COMM-42",
      "Primary navigation + mega-nav",
      "Navigation",
      "• Top-level nav: Women, Men, Bags, New, Coachtopia<br>• Full flyout / mega-nav (not only top-level links)<br><br>Rebuild required in Shopify.<br><br>Open: full Women / Men / Bags flyout crawl.",
      ""
    ],
    [
      "COMM-45",
      "See bag size overlay / size visualizer",
      "PDP",
      "“See bag size” overlay / size visualizer on PDP.<br><br>Open: how it works and what product/content data Shopify must hold.",
      ""
    ],
    [
      "COMM-46",
      "PDP lifestyle / content media",
      "PDP",
      "• “A Closer Look” lifestyle / detail media<br>• Promotional video (play / unmute)<br>• Editorial blocks (e.g. “Upgrade to Nappa Leather”, “More Reasons to Love”)",
      ""
    ],
    [
      "COMM-47",
      "Buy box (title, rating, price)",
      "PDP",
      "• Product title<br>• Star rating + review count (jumps to reviews)<br>• Price",
      ""
    ],
    [
      "COMM-50",
      "Add to Bag / Buy Now",
      "PDP",
      "• Primary Add to Bag CTA<br>• Buy Now express checkout",
      ""
    ],
    [
      "COMM-51",
      "Pick up in store (BOPIS)",
      "PDP",
      "• Buy online, pick up in store<br>• Find / edit preferred store",
      ""
    ],
    [
      "COMM-52",
      "Shipping and stock messaging",
      "PDP",
      "• Free shipping threshold messaging (e.g. $75+)<br>• Low-stock urgency (e.g. “Only 2 item(s) left!”)",
      ""
    ],
    [
      "COMM-53",
      "Product info accordions",
      "PDP",
      "• Product Details — style number, measurements, materials, strap/handle, features<br>• Editor’s Notes<br>• FAQ / Q&A",
      ""
    ],
    [
      "COMM-54",
      "Social share",
      "PDP",
      "Share via Facebook, Pinterest, Twitter/X, email.",
      ""
    ],
    [
      "COMM-56",
      "Collection listing page",
      "PLP",
      "• Collection title + product count<br>• Filters: bag categories, color, bag size, price, material, collection, style, …<br>• Sort including Featured / curated order<br><br>Source: https://www.coach.com/shop/women/collections/tabby",
      ""
    ],
    [
      "COMM-57",
      "PLP product cards",
      "PLP",
      "Grid cards include:<br>• Per-card image gallery (prev / next)<br>• Color swatches (scroll when many)<br>• Quick Add to Bag<br>• Price<br><br>On swatch change: keep the same gallery index / pose; swap to that color’s matching image when media is aligned across colors.",
      "Needs consistent image ordering/naming across variants (or pose-keyed media), not only “first image of selected variant”."
    ],
    [
      "COMM-58",
      "Customer account migration",
      "Migration",
      "Migrate:<br>• Accounts / profiles<br>• Addresses<br>• Order history linkage (if keeping continuity)<br>• Wishlist / preferences (including guest wishlist if retained)<br>• Marketing consent / email opt-in<br>• Auth handoff (passwords vs force reset / magic link)",
      ""
    ],
    [
      "COMM-59",
      "Saved payment method migration",
      "Migration",
      "Whether customers keep saved cards across cutover.",
      "Payment-token migration may be supported with Shopify involvement, depending on payment provider.<br><br>Do not assume customers must always re-save cards."
    ],
    [
      "COMM-60",
      "Historical order migration",
      "Migration",
      "Bring historical orders into Shopify (or archive + link):<br><br>• Line items, totals, taxes, shipping, discounts<br>• Fulfillment / refund / return status<br>• Customer linkage<br>• Order numbers / IDs for support continuity",
      ""
    ],
    [
      "COMM-61",
      "Product / catalog migration",
      "Migration",
      "• Products, variants, media, collections, and related catalog data<br><br>• Curated PLP “Featured” / manual sort positions must come over in migration (not only re-dragged in Admin later)",
      "Featured order → collection MANUAL sort with per-product positions (zero-based index), settable via Admin API <b>collectionReorderProducts</b>."
    ],
    [
      "COMM-62",
      "CMS / editorial pages strategy",
      "CMS",
      "Need a decision for about, campaigns, lookbooks, care, FAQ hubs, landing pages, etc.<br><br>Clarify:<br>• URL ownership / redirects<br>• Preview / publish workflow<br>• Localization<br>• Who edits content<br>• How nav / PDP / PLP link into those pages",
      "Option A: Bring into Shopify (Online Store pages, metaobjects, or Hydrogen CMS content).<br><br>Option B: Keep in a separate CMS and compose with the storefront (headless)."
    ],
    [
      "COMM-63",
      "PDP URL path structure",
      "Open",
      "Sample more PDPs across categories to confirm URL path structure (native Shopify routes vs custom).<br><br>Example Tabby:<br>https://www.coach.com/products/tabby-shoulder-bag-20-with-pillow-quilting/CP149-V5BLK.html",
      ""
    ],
    [
      "COMM-64",
      "Product attributes / metafields",
      "PDP",
      "Product-specific fields observed on the PDP. Map each to a native Shopify field or product/variant metafield.<br><br><b>Buy box / variants</b><br>• Title<br>• Price<br>• Color / material (swatch label + selected value)<br>• Linked color / material products (URL-changing swatches)<br><br><b>Product Details</b><br>• Style number<br>• Measurements<br>• Materials<br>• Strap / handle<br>• Features<br><br><b>Editorial / content</b><br>• Editor’s Notes<br>• FAQ / Q&amp;A<br>• Content blocks (e.g. “Upgrade to Nappa Leather”, “More Reasons to Love”)<br><br><b>Media</b><br>• Image gallery (including pose-aligned media across colors)<br>• “A Closer Look” lifestyle / detail media<br>• Promotional video<br>• See bag size / size visualizer data<br><br><b>Merchandising signals</b><br>• Low-stock messaging (inventory-driven)<br>• Free shipping messaging (if product- or threshold-driven on PDP)",
      ""
    ],
    [
      "COMM-65",
      "Checkout callouts (static + dynamic messaging)",
      "Checkout",
      "Current checkout shows callouts / trust messaging that must be brought into Shopify Checkout.<br><br><b>Static</b><br>• Items in the bag are not held and may sell out (above the subtotal block)<br>• Free shipping on orders $75+<br>• 30-day returns<br>• Need help? Contact us link<br><br><b>Dynamic</b><br>• Klarna / Afterpay layaway / monthly payment options with a monthly cost (e.g. from $13/month, or 4 payments at 0% interest)<br>• Amount depends on cart/checkout price",
      "Add via Checkout UI extension(s) and/or Klarna / Afterpay apps.<br><br>• Static inventory-hold copy above order summary subtotal<br>• Trust row (free shipping / returns / contact) in the summary footer<br>• Dynamic installment messaging from checkout total (app-provided or computed in the extension)"
    ],
    [
      "COMM-66",
      "Abandoned cart emails",
      "Email",
      "Recover incomplete carts with abandoned cart email(s).",
      ""
    ]
  ],
  "columnWidths": [
    90,
    247.62905883789062,
    120,
    300,
    420
  ]
}
