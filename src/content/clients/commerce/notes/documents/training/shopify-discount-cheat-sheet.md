---
title: "Shopify Discounts"
---

# Shopify checkout discounts

A Discount Function returns a list of operations. Checkout applies those operations. The function does not change the catalog price, add products to the cart, or call other systems on its own.

Source: [Discount Function API](https://shopify.dev/docs/api/functions/latest/discount), API version 2026-07.

There are three discount classes:

-   **Product.** A discount on a cart line.
    
-   **Order.** A discount on the merchandise subtotal.
    
-   **Shipping.** A discount on a delivery rate.
    

## Admin discounts

Created in Shopify admin. No custom app.

-   Percentage or fixed amount off products, a collection, or the order.
    
-   Buy X get Y, or free shipping over a threshold. Free shipping is the shipping class.
    
-   A code the customer types, or an automatic discount. A function can power either one. The simple versions are native.
    
-   Minimum spend or minimum quantity before the discount applies. The whole discount is on or off.
    
-   Only some customers, or a Shopify customer segment. An outside customer group has to exist in Shopify first.
    
-   A product discount, an order discount, and free shipping can stack only when each discount is set to combine.
    

## Discount Function

-   Discount only the lines whose own quantity is high enough. Lines under that number stay full price.
    
    _3 shirts get 10% off, and 2 hats in the same cart stay full price._
    
-   Change the discount as the cart total changes.
    
    _10% at $100 and 20% at $200._
    
-   Give one cart line a different percent or amount than another line.
    
    _shirts 20% off and hats $5 off in the same cart._
    
-   Discount some units on a line and leave the rest of that line full price.
    
    _buy 4 of one shirt and only the 4th is free._
    
-   Discount one shipping or pickup rate and leave the others full price.
    
    _ground shipping is free and express still costs $15._
    
-   Block a code the customer typed and show your own message. Only a function on an automatic discount can do this.
    
    _WELCOME is rejected with “New customers only.”_
    
-   Look up a code in another system during checkout. Plus or Enterprise only, and not on a development store.
    
    _STAFF10 is checked against an employee list before 10% is applied._
    

## Cannot

-   Add a free gift into the cart. A discount cannot add a line. The gift has to already be in the cart, or something else has to add it.
    
-   Change the catalog price or set the variant to a new price. The function returns a percentage or a fixed amount off.
    
-   Run the same behavior on the Create Order API. Create Order does not run these functions. Draft orders are partial, and network access is unsupported there.
    
-   Use price, tags, or collections the input query did not request. The function only sees the GraphQL input. Omitted fields are invisible.
    
-   Call an API from inside the discount calculation. The run target cannot make HTTP calls. Shopify can fetch first, and only on Plus or Enterprise.
    
-   Apply custom tax, duty, or a payment-method rule. Discounts change merchandise or shipping. Tax, duty, and payment methods are separate checkout settings.
    

## Operations

The function returns one list. Each entry is exactly one of these. Return an operation only for a discount class the code was created with.

-   `productDiscountsAdd`**.** One cart line, or a number of units on that line. Checkout takes a percentage or fixed amount off that line.
    
-   `orderDiscountsAdd`**.** The merchandise subtotal, with optional excluded line ids. Checkout takes a percentage or fixed amount off what remains.
    
-   **Delivery discount.** A shipping or pickup rate, from the delivery target. It is not a cart-line operation.
    
-   `enteredDiscountCodesReject`**.** Turn a code away with a message. Only when the function backs an automatic discount.
