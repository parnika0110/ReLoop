"use client";

/**
 * Next Life Score ring — the number and the arc come straight from `value`,
 * and the entrance draw is pure CSS.
 *
 * INVARIANT: whatever is on screen must always equal `value`.
 *
 * This ring used to count up from 0 with requestAnimationFrame plus a settle
 * setTimeout. Time-driven callbacks can be suspended — background or frozen
 * tab, throttled/headless preview — and when they were, the effect had done
 * its job but the frames never arrived: the ring sat at its initial 0 with an
 * empty arc while the explanation beside it correctly read
 * "Next Life Score 40/100". Nothing here may depend on a frame or a timer to
 * be right, so the final state is written on the element during render and the
 * keyframes only ever animate *towards* that same state.
 */
import type { CSSProperties } from "react";

interface ScoreRingProps {
  value: number;
  /** Outer diameter in px. */
  size?: number;
}

const DRAW_DURATION_MS = 1200;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function ScoreRing({ value, size = 260 }: ScoreRingProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeValue = clampScore(value);
  const targetOffset = circumference * (1 - safeValue / 100);

  const arcStyle = {
    // Endpoints for the draw keyframes. Declared as custom properties so the
    // animation lands exactly on the value the element already carries.
    "--score-ring-from": `${circumference}px`,
    "--score-ring-to": `${targetOffset}px`,
    animation: `score-ring-draw ${DRAW_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    transition: `stroke-dashoffset ${DRAW_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    filter: "drop-shadow(0 0 12px rgba(201, 242, 77, 0.35))",
  } as CSSProperties;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Next Life Score ${safeValue} out of 100`}
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
        {/* Progress: the attribute holds the final value, so a browser that
            never runs the keyframes still draws a correct arc. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#scoreRingGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={targetOffset}
          style={arcStyle}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="display tabular-nums text-lime"
          style={{ fontSize: size * 0.3 }}
        >
          {safeValue}
        </span>
        <span className="label-mono mt-1 text-muted">/ 100</span>
      </div>
    </div>
  );
}
