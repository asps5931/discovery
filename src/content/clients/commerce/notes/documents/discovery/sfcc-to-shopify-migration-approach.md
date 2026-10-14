---
title: "SFCC to Shopify: migration approach"
---

# SFCC to Shopify: migration approach

Updated: 10/5/2026

## Goal

Replace Salesforce Commerce Cloud (SFCC) with Shopify as the headless backend. Keep the existing React storefront and its functionality. Rebuild checkout using Shopify Checkout.

## Approach

```text
+----------------------+       +------------------+       +------------------+
|   React storefront   | <---> | Commerce adapter | <---> |   Shopify APIs   |
+----------------------+       +------------------+       +------------------+
           |
           | Checkout URL handoff
           v
+----------------------+
|   Shopify Checkout   |
+----------------------+
           |
           | Place order
           v
+----------------------+       +------------------+       +------------------+
|    Shopify order     | ----> |New OMS middleware| ----> |   Existing OMS   |
+----------------------+       +------------------+       +------------------+
```

## Storefront

- Review existing GraphQL queries, mutations and the code that uses them to identify what needs replacing. Check for functionality outside GraphQL too.
- Build a commerce adapter that translates storefront operations into Shopify API calls and converts responses into the format the storefront expects.
- Map behavior as well as data: products, variants, pricing, inventory, cart, discounts, accounts and localization.
- Identify any functionality that cannot be preserved through the adapter. Confirm the implementation approach after reviewing the codebase.

## Checkout

- Use traditional discovery to document the exact flow, rules, integrations and edge cases.
- Implement the required behavior through Shopify settings, checkout extensions, Functions or supported apps.
- Identify capability gaps and any changes customers will notice.

## OMS middleware

Likely requires new middleware to transform Shopify order data and deliver it to the existing OMS. Confirm scope after reviewing the OMS API and current integration. Plan for retries, duplicate protection and scheduled recovery or alerts.

## Current unknowns

Actively being investigated:

| Unknown | Why it matters |
| --- | --- |
| Storefront code access | Needed to understand the SFCC integration and adapter scope. |
| Site documentation access | Needed to assess existing specifications and documentation quality. |
| Timeline | Determines milestones and delivery sequence. |
| Budget | Determines feasible scope and capacity. |
| Checkout rules and logic | Needed to define the replacement experience and identify Shopify gaps. |

If the existing documentation is weak, highlight better documentation standards as part of our build proposal. Its quality has not yet been assessed.

## Next steps

1. Obtain code and documentation access; confirm timeline and budget.
2. Map storefront operations to Shopify capabilities and complete checkout discovery.
3. Confirm OMS middleware requirements and validate a complete purchase through to the OMS.
