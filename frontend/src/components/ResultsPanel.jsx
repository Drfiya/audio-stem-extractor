/**
 * ResultsPanel — displays completed stems with playback and download options.
 *
 * Two view modes (toggled via segmented control):
 *   - **Mixer**: Synchronized playback of all stems with Mute/Solo/Volume per stem
 *   - **Individual**: Standalone waveform player per stem card
 *
 * Both modes include per-stem download buttons and a "Download All as ZIP" button.
 *
 * @param {{
 *   stems: Array<{ name: string, filename: string, size_bytes: number, download_url: string }>,
 *   jobId: string,
 *   zipUrl: string | null,
 * }} props
 */

import React, { useState } from "react";
import StemPlayer from "./StemPlayer";
import StemMixer from "./StemMixer";
import { formatSize } from "../utils/api";

/** Assign a unique colour to each stem for the waveform. */
const STEM_COLORS = {
    Vocals: "#a78bfa",
    Drums: "#fb7185",
    Bass: "#34d399",
    Other: "#fbbf24",
    Guitar: "#22d3ee",
    Piano: "#f472b6",
    Instrumental: "#60a5fa",
};

function colorFor(name) {
    return STEM_COLORS[name] || "#8b5cf6";
}

export default function ResultsPanel({ stems, jobId, zipUrl }) {
    const [view, setView] = useState("mixer"); // "mixer" | "individual"

    if (!stems || stems.length === 0) return null;

    return (
        <div className="space-y-4 animate-slide-up">
            {/* ── Header + view toggle ────────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-accent-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    Stems Ready
                </h2>

                {/* View mode toggle */}
                <div className="flex rounded-xl overflow-hidden border border-gray-700">
                    {[
                        { key: "mixer", label: "🎛 Mixer" },
                        { key: "individual", label: "🎵 Individual" },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setView(key)}
                            className={`
                px-4 py-1.5 text-xs font-semibold tracking-wide transition-colors
                ${view === key
                                    ? "bg-brand-600 text-white"
                                    : "bg-surface-850 text-gray-400 hover:text-gray-200"
                                }
              `}
                            aria-pressed={view === key}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Mixer view ──────────────────────────────── */}
            {view === "mixer" && <StemMixer stems={stems} />}

            {/* ── Individual view ─────────────────────────── */}
            {view === "individual" && (
                <div className="grid gap-3">
                    {stems.map((stem) => (
                        <div
                            key={stem.filename}
                            className="
                rounded-xl border border-gray-800 bg-surface-850/80
                p-4 space-y-3 hover:border-gray-700 transition-colors
              "
                        >
                            {/* Header: name + size + download */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-2.5 h-2.5 rounded-full"
                                        style={{ backgroundColor: colorFor(stem.name) }}
                                    />
                                    <span className="font-semibold text-gray-100">{stem.name}</span>
                                    <span className="text-xs text-gray-500">
                                        {formatSize(stem.size_bytes)}
                                    </span>
                                </div>
                                <a
                                    href={stem.download_url}
                                    download={stem.filename}
                                    className="
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                    bg-surface-900 border border-gray-700
                    text-xs font-medium text-gray-300
                    hover:border-brand-500/50 hover:text-brand-400 transition-all
                  "
                                    aria-label={`Download ${stem.name}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                    </svg>
                                    Download
                                </a>
                            </div>

                            {/* Waveform player */}
                            <StemPlayer
                                url={stem.download_url}
                                name={stem.name}
                                color={colorFor(stem.name)}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* ── Download buttons (both views) ───────────── */}
            <div className="flex flex-wrap gap-3">
                {/* Per-stem downloads in mixer view */}
                {view === "mixer" &&
                    stems.map((stem) => (
                        <a
                            key={stem.filename}
                            href={stem.download_url}
                            download={stem.filename}
                            className="
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                bg-surface-900 border border-gray-700
                text-xs font-medium text-gray-300
                hover:border-brand-500/50 hover:text-brand-400 transition-all
              "
                            aria-label={`Download ${stem.name}`}
                        >
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: colorFor(stem.name) }}
                            />
                            {stem.name}
                        </a>
                    ))}

                {/* Download All ZIP */}
                {zipUrl && (
                    <a
                        href={zipUrl}
                        download
                        className="
              inline-flex items-center gap-2 px-6 py-3 rounded-xl
              bg-gradient-to-r from-brand-600 to-brand-500
              text-white font-semibold shadow-lg shadow-brand-600/20
              hover:shadow-brand-600/40 hover:brightness-110 transition-all duration-200
            "
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                        </svg>
                        Download All as ZIP
                    </a>
                )}
            </div>
        </div>
    );
}
