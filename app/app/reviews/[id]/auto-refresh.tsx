"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Reloads the page data every few seconds while the models are still working.
export function AutoRefresh({ everyMs = 4000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(t);
  }, [router, everyMs]);
  return null;
}
