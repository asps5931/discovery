import { useEffect, useState } from "react";
import { PocOffline, serviceUp } from "../../../../../components/PocOffline";

const STOREFRONT = "http://localhost:3100/";

export default function HeadlessPoc() {
  const [down, setDown] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let stop = false;
    serviceUp(STOREFRONT).then((up) => {
      if (stop) return;
      if (up) {
        window.location.assign(STOREFRONT);
        return;
      }
      setDown(true);
    });
    return () => {
      stop = true;
    };
  }, [retry]);

  if (down) {
    return (
      <PocOffline
        title="Headless"
        detail="The Hydrogen storefront is not running on port 3100. In a new terminal, from this discovery repo root:"
        command={"cd hydrogen\nnpm run dev -- --port 3100"}
        onRetry={() => {
          setDown(false);
          setRetry((value) => value + 1);
        }}
      />
    );
  }

  return <div className="min-h-screen bg-gray-50 px-6 py-20 text-sm text-gray-600">Checking the headless server…</div>;
}
