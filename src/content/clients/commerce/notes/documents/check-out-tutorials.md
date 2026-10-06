---
title: "Checkout Tutorials"
---

# Shopify checkout customization: dev store walkthrough

This walkthrough tests two independent checkout customizations on a **Shopify Plus dev store**:

1.  A **Delivery instructions** field saved to an order metafield.
    
2.  A coupon code, `THREE10`, that gives 10% off an order containing at least three items.
    

You need a Plus dev store with test products. Use a test payment gateway for the final order; dev stores cannot process live payments. The Function example requires Shopify CLI in a terminal, including a cloud development environment such as Codespaces.

## 1\. Add a checkout field and save it to an order metafield

This example uses Shopify’s **Checkout Blocks** app; no custom code is required.

1.  Install **Checkout Blocks** on the Plus dev store.
    
2.  In Shopify admin, open **Apps → Checkout Blocks → Blocks → Create block → Custom field** and select **Blank template**.
    
3.  Name the block **Delivery instructions**. Leave **Display rules** empty so every customer sees it.
    
4.  In **Content**, set **Save as** to **Order metafield**. Under **Fields**, add a **Text input** labeled **Delivery instructions**, set its key to `delivery_instructions`, and leave it optional for this test.
    
5.  Save the block and change its status from **Draft** to **Active**.
    
6.  Choose **More actions → Add to checkout**, open the checkout editor, add a **Custom field Checkout Blocks** block at the desired location, select the matching block ID, and save the checkout configuration.
    
7.  Place a test order containing a delivery instruction. The value should be stored on the order under `checkoutblocks.delivery_instructions`. If you want to display it on the order detail page, add an **Order metafield definition** with that namespace and key.
    

Checkout Blocks adds the field as a block near Shopify’s checkout forms; it does not insert a field inside the existing address form. See Shopify’s [custom field block guide](https://help.shopify.com/en/manual/checkout-settings/checkout-blocks/blocks/create-block/custom-field).

## 2\. Add a coupon powered by a Shopify Function

This example uses a **code discount**. The Function performs the quantity check; entering the code with fewer than three items gives no discount. Shopify Plus allows a custom app containing Shopify Functions.

### Create the app and extension

From a terminal, run:

```bash
shopify app init
```

Choose **Build an extension-only app**, name the app, and change into its new directory. Then run:

```bash
shopify app generate extension --template discount --name cart-three-code
```

Select **TypeScript** when prompted. In the root `shopify.app.toml`, ensure `write_discounts` is included in the app’s access scopes. In the generated extension’s `shopify.extension.toml`, confirm the `cart.lines.discounts.generate.run` target and note the extension’s `handle`. If the generator included a `cart.delivery-options.discounts.generate.run` target, remove that target block from the TOML for this order-only example.

### Supply the Function input

Replace `extensions/cart-three-code/src/cart_lines_discounts_generate_run.graphql` with:

```graphql
query CartInput {
  cart {
    lines {
      quantity
    }
  }
  discount {
    discountClasses
  }
}
```

Replace `extensions/cart-three-code/src/cart_lines_discounts_generate_run.ts` with:

```ts
import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  CartInput,
  CartLinesDiscountsGenerateRunResult,
} from "../generated/api";

export function cartLinesDiscountsGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  const quantity = input.cart.lines.reduce(
    (total, line) => total + line.quantity,
    0,
  );

  if (
    quantity < 3 ||
    !input.discount.discountClasses.includes(DiscountClass.Order)
  ) {
    return { operations: [] };
  }

  return {
    operations: [
      {
        orderDiscountsAdd: {
          candidates: [
            {
              message: "THREE10",
              targets: [
                { orderSubtotal: { excludedCartLineIds: [] } },
              ],
              value: { percentage: { value: 10 } },
            },
          ],
          selectionStrategy: OrderDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}
```

This adapts Shopify’s [Discount Function tutorial](https://shopify.dev/docs/apps/build/discounts/build-discount-function?extension=typescript) to apply an order discount when the sum of cart line quantities reaches three. The percentage is `10` for 10%.

### Create the code discount in Shopify

Run `shopify app dev` and select the Plus dev store. The CLI builds the Function and previews the app on that store. Press `g` in the CLI to open Admin GraphiQL. Select the latest stable Admin API version and run:

```graphql
mutation {
  discountCodeAppCreate(
    codeAppDiscount: {
      title: "10% off three items"
      code: "THREE10"
      functionHandle: "cart-three-code"
      discountClasses: [ORDER]
      startsAt: "2026-09-01T00:00:00Z"
    }
  ) {
    codeAppDiscount {
      discountId
      title
    }
    userErrors {
      field
      message
    }
  }
}
```

Use the actual `handle` from `shopify.extension.toml` if it differs. Check that `userErrors` is empty. The code is created as an app discount associated with that Function; creating an ordinary code in the Discounts admin would not attach this custom logic. See `discountCodeAppCreate` and its `functionHandle` [input](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/DiscountCodeAppInput).

### Test it

1.  Enter `THREE10` at checkout with **two items**; no discount should be applied.
    
2.  Increase the cart to **three items** and retry; the order subtotal should receive **10% off**.
    
3.  Complete a test order to check both the coupon and the delivery instructions metafield. Review Function executions in the `shopify app dev` terminal if the discount does not appear.
    

If your storefront is headless, you can also apply the code before redirecting to checkout with Storefront API `cartDiscountCodesUpdate`.

## Platform notes

-   Checkout fields on the information, shipping, or payment steps require **Shopify Plus**. For more complex fields than Checkout Blocks supports, use a [Checkout UI extension](https://shopify.dev/docs/apps/build/checkout/fields-banners/add-field).
    
-   The CLI-generated paths can vary with the name chosen for the extension. Follow the names in your generated project if they differ from this example.
    
-   Shopify’s [dev store documentation](https://shopify.dev/docs/apps/build/stores/development-stores) covers Plus-plan test stores and simulated checkout orders.

## Address autocomplete

Shopify Checkout already suggests addresses for a supported set of countries. A Checkout UI extension can send what the customer types to Loqate, return those suggestions, and fill the address fields when the customer selects one. Shopify lists Loqate, along with Google Places and HERE, as an example provider. This requires Shopify Plus. [Address targets](https://shopify.dev/docs/api/checkout-ui-extensions/2026-01/targets/checkout/address).

This is the way to answer yes to "Does checkout include address verification or autocomplete?" in the checkout questionnaire.
