import {
  useEffect,
  useState,
  type DetailedHTMLProps,
  type HTMLAttributes,
} from "react";

const SHOP = "tapestry-checkout-demo.myshopify.com";
const KIT_SRC =
  "https://cdn.shopify.com/shopifycloud/checkout-web/component/unstable/kit.js";

const PRODUCTS = [
  { id: "67595606655055", name: "The Complete Snowboard", price: 699.95 },
  { id: "67595606622287", name: "The Videographer Snowboard", price: 885.95 },
  { id: "67595603837007", name: "The Inventory Not Tracked Snowboard", price: 949.95 },
];

type CheckoutElement = HTMLElement & { open?: () => void };

function checkoutUrl(lines: Record<string, number>) {
  const cart = Object.entries(lines)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => `${id}:${qty}`)
    .join(",");
  return `https://${SHOP}/cart/${cart}`;
}

function presentCheckout(url: string) {
  const checkout = document.querySelector("shopify-checkout") as CheckoutElement | null;
  if (checkout?.open) {
    checkout.setAttribute("target", "popup");
    checkout.setAttribute("src", url);
    checkout.open();
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function CheckoutKitPoc() {
  const [qty, setQty] = useState<Record<string, number>>({
    [PRODUCTS[0].id]: 1,
  });
  const [status, setStatus] = useState("Checkout opens in a popup.");

  useEffect(() => {
    const onComplete = () => setStatus("Order completed.");
    const onClose = () => setStatus("Checkout closed.");
    let el: Element | null = null;
    let cancelled = false;

    async function setup() {
      if (!customElements.get("shopify-checkout")) {
        if (!document.querySelector(`script[src="${KIT_SRC}"]`)) {
          const script = document.createElement("script");
          script.type = "module";
          script.src = KIT_SRC;
          document.head.appendChild(script);
        }
        await customElements.whenDefined("shopify-checkout");
      }
      if (cancelled) return;
      el = document.querySelector("shopify-checkout");
      el?.addEventListener("checkout:complete", onComplete);
      el?.addEventListener("checkout:close", onClose);
    }

    void setup();
    return () => {
      cancelled = true;
      el?.removeEventListener("checkout:complete", onComplete);
      el?.removeEventListener("checkout:close", onClose);
    };
  }, []);

  const lines = Object.values(qty).reduce((sum, n) => sum + n, 0);
  const url = checkoutUrl(qty);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <shopify-checkout target="popup" />
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <h1 className="text-xl font-bold">Checkout Kit</h1>
          <p className="mt-1 text-sm text-gray-500">{status}</p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {PRODUCTS.map((product) => (
            <li key={product.id} className="flex items-center justify-between gap-4 px-4 py-4">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-gray-500">${product.price.toFixed(2)}</p>
              </div>
              <input
                aria-label={`${product.name} quantity`}
                className="w-16 rounded border border-gray-300 px-2 py-1 text-right"
                min={0}
                type="number"
                value={qty[product.id] ?? 0}
                onChange={(event) =>
                  setQty((prev) => ({
                    ...prev,
                    [product.id]: Math.max(0, Number(event.target.value) || 0),
                  }))
                }
              />
            </li>
          ))}
        </ul>
        <a
          className="mt-6 inline-block rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          href={lines ? url : undefined}
          onClick={(event) => {
            if (!lines) {
              event.preventDefault();
              return;
            }
            event.preventDefault();
            setStatus("Opening checkout…");
            presentCheckout(url);
          }}
          style={lines ? undefined : { pointerEvents: "none", opacity: 0.4 }}
        >
          Checkout
        </a>
      </main>
    </div>
  );
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "shopify-checkout": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { target?: string };
    }
  }
}
