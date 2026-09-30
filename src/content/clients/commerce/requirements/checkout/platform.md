---
title: "Checkout Imlementation: Native vs Checkout Kit"
---

# Checkout Implementation

#### Summary

Checkout will run on **Shopify**. The exact checkout implementation approach is **not decided** yet.

#### Open decision: checkout implementation

Choose one of the following (or document a hybrid if applicable):

| Option | Notes |
| --- | --- |
| **Native Shopify Checkout** | Hosted Shopify checkout (including Shopify Plus checkout where applicable). Least custom UI control; strongest out-of-box PCI / conversion tooling. |
| **Shopify Checkout UI Kit / checkout extensibility** | Customized checkout experience built with Shopify’s checkout UI / extensibility stack. More control over UX; more build and maintenance cost. |

Acceptance criteria (once decided)

-   Decision is recorded here with rationale (cost, UX control, timeline, Plus features, localization needs).
    
-   Downstream requirements (payment, coupons, localization) are updated to match the chosen approach.
    
-   Out-of-scope items for the non-chosen option are explicitly listed.
