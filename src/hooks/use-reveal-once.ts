"use client";

import { useEffect, useRef, useState } from "react";

/**
 * useRevealOnce - fires once when the target element enters the viewport.
 *
 * Returns [ref, isVisible]. isVisible starts false and flips to true the
 * first time >= threshold of the element is visible; it never resets.
 *
 * Falls back to true immediately (single rAF) when IntersectionObserver is
 * not available (old browsers, SSR hydration edge-cases).
 */
export function useRevealOnce<T extends HTMLElement = HTMLElement>(
  threshold = 0.1,
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (isVisible) return;

    if (typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, isVisible]);

  return [ref, isVisible];
}
