import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  CartInput,
  CartLinesDiscountsGenerateRunResult,
} from '../generated/api';

export function cartLinesDiscountsGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  if (!input.discount.discountClasses.includes(DiscountClass.Order)) {
    return {operations: []};
  }

  const excludedCartLineIds = input.cart.lines
    .filter((line) => line.quantity < 3)
    .map((line) => line.id);

  if (excludedCartLineIds.length === input.cart.lines.length) {
    return {operations: []};
  }

  return {
    operations: [
      {
        orderDiscountsAdd: {
          candidates: [
            {
              message: 'THREE10',
              targets: [
                {
                  orderSubtotal: {
                    excludedCartLineIds,
                  },
                },
              ],
              value: {
                percentage: {
                  value: 10,
                },
              },
            },
          ],
          selectionStrategy: OrderDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}
