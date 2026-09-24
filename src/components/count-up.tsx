"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that counts to itself.
 *
 * Starts at the final value, not at zero: this renders on the server first,
 * and a board that ships "0" in its HTML would show zeros to anything that
 * does not run the animation — a crawler, a print, a browser mid-hydration.
 * The climb only begins once the client is awake, and never at all if the
 * reader has asked for less motion.
 */
export function CountUp({
  value,
  duration = 900,
  delay = 0,
  className,
}: {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const frame = useRef<number | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      value === 0
    )
      return;

    setShown(0);
    timer.current = setTimeout(() => {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        // Ease out: fast first, so the big numbers settle before the eye does.
        setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
        if (t < 1) frame.current = requestAnimationFrame(step);
      };
      frame.current = requestAnimationFrame(step);
    }, delay);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, duration, delay]);

  return (
    <span className={className} suppressHydrationWarning>
      {shown}
    </span>
  );
}
