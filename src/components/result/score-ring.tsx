"use client";

/**
 * Animated Next Life Score ring.
 * SVG stroke draw + count-up, both driven by mount. Respects
 * prefers-reduced-motion (renders final state immediately).
 */
import { useEffect, useRef, useState } from "react";

interface ScoreRingProps {
  value: number;
  /** Outer diameter in px. */
  size?: number;
}

export function ScoreRing({ value, size = 260 }: ScoreRingProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference * (1 - Math.max(0, Math.min(100, value)) / 100);

  const [display, setDisplay] = useState(0);
  const [offset, setOffset] = useState(circumference);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      // Deferred so state updates never run synchronously inside the effect.
      const raf = requestAnimationFrame(() => {
        setDisplay(value);
        setOffset(targetOffset);
      });
      return () => cancelAnimationFrame(raf);
    }

    // Draw the ring.
    const drawRaf = requestAnimationFrame(() => setOffset(targetOffset));

    // Count up over 1.1s with an ease-out curve.
    const duration = 1100;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(drawRaf);
      cancelAnimationFrame(raf);
    };
  }, [value, targetOffset]);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Next Life Score ${value} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="scoreRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c9f24d" />
            <stop offset="60%" stopColor="#ddf8a3" />
            <stop offset="100%" stopColor="#d9f2e3" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          stroke="rgba(255,255,255,0.07)"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#scoreRingGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
            filter: "drop-shadow(0 0 12px rgba(201, 242, 77, 0.35))",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="display tabular-nums text-lime"
          style={{ fontSize: size * 0.3 }}
        >
          {display}
        </span>
        <span className="label-mono mt-1 text-muted">/ 100</span>
      </div>
    </div>
  );
}
