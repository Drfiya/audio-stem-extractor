/**
 * ProgressBar — animated progress indicator with stage label and ETA.
 *
 * @param {{
 *   progress: number,   // 0–100
 *   stage: string,      // e.g. "Separating stems…"
 *   eta: number | null, // seconds remaining
 * }} props
 */

import React from "react";

/**
 * Format seconds into "Xm Ys" or "Ys".
 * @param {number | null} sec
 */
function formatEta(sec) {
    if (sec == null || sec <= 0) return "";
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return m > 0 ? `~${m}m ${s}s remaining` : `~${s}s remaining`;
}

export default function ProgressBar({ progress, stage, eta }) {
    const pct = Math.min(Math.max(progress, 0), 100);

    return (
        <div className="w-full space-y-2 animate-fade-in" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            {/* Labels */}
            <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-200">{stage}</span>
                <span className="tabular-nums text-brand-400 font-semibold">
                    {pct.toFixed(0)}%
                </span>
            </div>

            {/* Bar track */}
            <div className="h-2.5 w-full rounded-full bg-surface-850 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                        width: `${pct}%`,
                        background:
                            "linear-gradient(90deg, var(--color-brand-600), var(--color-accent-cyan))",
                    }}
                />
            </div>

            {/* ETA */}
            {eta != null && eta > 0 && (
                <p className="text-xs text-gray-500 text-right">{formatEta(eta)}</p>
            )}
        </div>
    );
}
