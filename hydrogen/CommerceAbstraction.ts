export class CommerceAbstraction {
  // Products and variants
  getProduct(_id: unknown): unknown {
    throw new Error("Not implemented");
  }

  listProducts(): unknown {
    throw new Error("Not implemented");
  }

  searchProducts(_query: unknown): unknown {
    throw new Error("Not implemented");
  }

  // Pricing
  getPrice(variantId: unknown, _marketOrCurrency: unknown): unknown {
    const product = this.getProduct(variantId) as {price: unknown};
    return product.price;
  }

  // Inventory
  getAvailableQuantity(variantId: unknown, _locationId: unknown): unknown {
    const product = this.getProduct(variantId) as {availableQuantity: unknown};
    return product.availableQuantity;
  }

  // Cart
  createCart(): unknown {
    throw new Error("Not implemented");
  }

  getCart(_cartId: unknown): unknown {
    throw new Error("Not implemented");
  }

  addCartLine(_cartId: unknown, _line: unknown): unknown {
    throw new Error("Not implemented");
  }

  updateCartLine(_cartId: unknown, _lineId: unknown, _line: unknown): unknown {
    throw new Error("Not implemented");
  }

  removeCartLine(_cartId: unknown, _lineId: unknown): unknown {
    throw new Error("Not implemented");
  }

  // Discounts
  applyDiscountCode(_cartId: unknown, _code: unknown): unknown {
    throw new Error("Not implemented");
  }

  removeDiscountCode(_cartId: unknown, _code: unknown): unknown {
    throw new Error("Not implemented");
  }

  // Accounts
  getCustomer(_customerId: unknown): unknown {
    throw new Error("Not implemented");
  }

  getLoginUrl(): unknown {
    throw new Error("Not implemented");
  }

  listAddresses(_customerId: unknown): unknown {
    throw new Error("Not implemented");
  }

  // Localization
  getMarket(): unknown {
    throw new Error("Not implemented");
  }

  getLanguage(): unknown {
    throw new Error("Not implemented");
  }

  getCurrency(): unknown {
    throw new Error("Not implemented");
  }

  // Checkout
  getCheckoutUrl(_cartId: unknown): unknown {
    throw new Error("Not implemented");
  }
}
