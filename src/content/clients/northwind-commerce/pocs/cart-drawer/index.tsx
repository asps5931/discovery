import React, { useState } from "react";
import { ShoppingCart, X, Plus, Minus, Trash2, Check } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  color: string;
}

interface CartLine {
  product: Product;
  quantity: number;
}

const PRODUCTS: Product[] = [
  { id: "1", name: "Classic Cotton Tee", price: 32, image: "", color: "#3b82f6" },
  { id: "2", name: "Wool Blend Sweater", price: 89, image: "", color: "#a855f7" },
  { id: "3", name: "Canvas Sneakers", price: 65, image: "", color: "#eab308" },
  { id: "4", name: "Leather Wallet", price: 48, image: "", color: "#92400e" },
];

const FREE_SHIPPING_THRESHOLD = 75;

export default function CartDrawerPoc() {
  const [cart, setCart] = useState<CartLine[]>([
    { product: PRODUCTS[0], quantity: 2 },
    { product: PRODUCTS[2], quantity: 1 },
  ]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id
            ? { ...l, quantity: l.quantity + 1 }
            : l
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setDrawerOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product.id === productId
            ? { ...l, quantity: Math.max(0, l.quantity + delta) }
            : l
        )
        .filter((l) => l.quantity > 0)
    );
  };

  const removeLine = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
  const itemCount = cart.reduce((sum, l) => sum + l.quantity, 0);
  const shippingProgress = Math.min(subtotal / FREE_SHIPPING_THRESHOLD, 1);
  const remainingForFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Storefront header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Northwind Store</h1>
            <p className="text-sm text-gray-500">Cart Drawer Prototype</p>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Open cart"
          >
            <ShoppingCart className="h-6 w-6 text-gray-700" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-600 text-white text-xs font-medium flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <p className="text-gray-500 mb-8">
          Click "Add to Cart" on any product to see the drawer slide in. Try the
          quantity controls, remove items, and watch the free shipping bar update.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {PRODUCTS.map((product) => (
            <div
              key={product.id}
              className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col shadow-sm"
            >
              <div
                className="aspect-square rounded-lg mb-3 flex items-center justify-center"
                style={{ backgroundColor: product.color + "40" }}
              >
                <div
                  className="w-16 h-16 rounded-full"
                  style={{ backgroundColor: product.color }}
                />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {product.name}
              </h3>
              <p className="text-sm text-gray-500 mb-3">${product.price}</p>
              <button
                onClick={() => addToCart(product)}
                className="mt-auto w-full py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Cart drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-gray-200 z-50 flex flex-col animate-slide-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Your Cart ({itemCount})
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close cart"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {cart.length > 0 && (
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                {remainingForFreeShipping > 0 ? (
                  <p className="text-xs text-gray-600 mb-2">
                    You're{" "}
                    <span className="text-blue-600 font-medium">
                      ${remainingForFreeShipping.toFixed(2)}
                    </span>{" "}
                    away from free shipping!
                  </p>
                ) : (
                  <p className="text-xs text-blue-600 mb-2 flex items-center gap-1">
                    <Check className="h-3 w-3" /> You've unlocked free shipping!
                  </p>
                )}
                <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500 ease-out"
                    style={{ width: `${shippingProgress * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingCart className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm mb-4">Your cart is empty</p>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Browse products
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((line) => (
                    <div key={line.product.id} className="flex gap-3 items-center">
                      <div
                        className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: line.product.color + "30" }}
                      >
                        <div
                          className="w-8 h-8 rounded-full"
                          style={{ backgroundColor: line.product.color }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {line.product.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          ${line.product.price.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(line.product.id, -1)}
                            className="p-1 rounded hover:bg-gray-100 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3 text-gray-500" />
                          </button>
                          <span className="text-sm text-gray-900 font-mono min-w-[20px] text-center">
                            {line.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(line.product.id, 1)}
                            className="p-1 rounded hover:bg-gray-100 transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3 text-gray-500" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          ${(line.product.price * line.quantity).toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeLine(line.product.id)}
                          className="p-1 rounded hover:bg-gray-100 transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-gray-200 px-6 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Subtotal</span>
                  <span className="text-lg font-semibold text-gray-900">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Shipping and taxes calculated at checkout
                </p>
                <button className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors">
                  Checkout
                </button>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Continue shopping
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
