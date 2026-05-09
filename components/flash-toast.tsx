"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function FlashToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const flash = searchParams.get("flash");
    const error = searchParams.get("error");
    const msg = flash || error;
    if (!msg) return;
    setMessage(decodeURIComponent(msg));
    setIsError(!!error);
    setVisible(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("flash");
    params.delete("error");
    const newUrl = params.size ? `${pathname}?${params}` : pathname;
    router.replace(newUrl, { scroll: false });
    const hideTimer = setTimeout(() => setVisible(false), 4500);
    const clearTimer = setTimeout(() => setMessage(null), 5000);
    return () => { clearTimeout(hideTimer); clearTimeout(clearTimer); };
  }, [searchParams, pathname, router]);

  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={[
        "fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg px-5 py-3 text-sm font-semibold shadow-xl transition-opacity duration-500 lg:bottom-6",
        isError ? "bg-red-600 text-white" : "bg-foreground text-background",
        visible ? "opacity-100" : "opacity-0"
      ].join(" ")}
    >
      {isError ? "⚠ " : "✓ "}{message}
    </div>
  );
}
