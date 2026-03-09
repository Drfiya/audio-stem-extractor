/**
 * StemMixer — synchronized multi-stem player with mute/solo controls.
 *
 * Plays all stems in perfect sync. Each stem gets:
 *   - A colour-coded waveform (WaveSurfer)
 *   - Mute / Solo toggle buttons
 *   - A volume slider
 *
 * The master transport bar at the top provides:
 *   - Play / Pause
 *   - Global seek (scrub) bar
 *   - Current time / total duration display
 *
 * @param {{
 *   stems: Array<{ name: string, filename: string, size_bytes: number, download_url: string }>,
 * }} props
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

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

/** mm:ss formatter */
function fmt(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function StemMixer({ stems }) {
    // Track state for each stem: { muted, solo, volume }
    const [stemStates, setStemStates] = useState(() =>
        stems.map(() => ({ muted: false, solo: false, volume: 1.0 }))
    );
    const [playing, setPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [ready, setReady] = useState(false);

    // Refs for WaveSurfer instances (one per stem)
    const wsRefs = useRef([]);
    const containerRefs = useRef([]);
    const readyCount = useRef(0);

    // Derive effective mute state: if any stem is solo'd, only solo'd stems play
    const hasSolo = stemStates.some((s) => s.solo);
    const effectiveMuted = stemStates.map((s) => {
        if (hasSolo) return !s.solo;
        return s.muted;
    });

    // ── Initialise WaveSurfer instances ──────────────────

    useEffect(() => {
        // Cleanup previous instances
        wsRefs.current.forEach((ws) => ws?.destroy());
        wsRefs.current = [];
        readyCount.current = 0;
        setReady(false);

        stems.forEach((stem, i) => {
            const container = containerRefs.current[i];
            if (!container) return;

            const color = colorFor(stem.name);
            const ws = WaveSurfer.create({
                container,
                waveColor: `${color}44`,
                progressColor: color,
                cursorColor: "#22d3ee",
                barWidth: 2,
                barGap: 1.5,
                barRadius: 2,
                height: 40,
                normalize: true,
                interact: false, // disable per-stem seeking — use master bar instead
            });

            ws.load(stem.download_url);

            ws.on("ready", () => {
                readyCount.current += 1;
                // Use the longest stem as duration
                if (ws.getDuration() > duration) {
                    setDuration(ws.getDuration());
                }
                // All stems loaded?
                if (readyCount.current === stems.length) {
                    setReady(true);
                }
            });

            // Only track time from the first stem to avoid jitter
            if (i === 0) {
                ws.on("audioprocess", () => setCurrentTime(ws.getCurrentTime()));
                ws.on("finish", () => {
                    setPlaying(false);
                    setCurrentTime(0);
                    // Reset all stems to beginning
                    wsRefs.current.forEach((w) => w?.seekTo(0));
                });
            }

            wsRefs.current[i] = ws;
        });

        return () => {
            wsRefs.current.forEach((ws) => ws?.destroy());
            wsRefs.current = [];
        };
    }, [stems]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Sync mute/volume with WaveSurfer ─────────────────

    useEffect(() => {
        wsRefs.current.forEach((ws, i) => {
            if (!ws) return;
            const isMuted = effectiveMuted[i];
            ws.setVolume(isMuted ? 0 : stemStates[i].volume);
        });
    }, [stemStates, effectiveMuted]);

    // ── Master transport ─────────────────────────────────

    const togglePlay = useCallback(() => {
        if (!ready) return;
        if (playing) {
            wsRefs.current.forEach((ws) => ws?.pause());
        } else {
            wsRefs.current.forEach((ws) => ws?.play());
        }
        setPlaying((p) => !p);
    }, [ready, playing]);

    const handleSeek = useCallback(
        (e) => {
            const pct = parseFloat(e.target.value) / 100;
            wsRefs.current.forEach((ws) => ws?.seekTo(pct));
            setCurrentTime(pct * duration);
        },
        [duration]
    );

    // ── Per-stem controls ────────────────────────────────

    const toggleMute = useCallback((index) => {
        setStemStates((prev) =>
            prev.map((s, i) => (i === index ? { ...s, muted: !s.muted, solo: false } : s))
        );
    }, []);

    const toggleSolo = useCallback((index) => {
        setStemStates((prev) =>
            prev.map((s, i) => (i === index ? { ...s, solo: !s.solo, muted: false } : s))
        );
    }, []);

    const setVolume = useCallback((index, vol) => {
        setStemStates((prev) =>
            prev.map((s, i) => (i === index ? { ...s, volume: vol } : s))
        );
    }, []);

    // Play all / mute all helpers
    const unmuteAll = useCallback(() => {
        setStemStates((prev) => prev.map((s) => ({ ...s, muted: false, solo: false })));
    }, []);

    const seekPct = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="space-y-4 animate-fade-in">
            {/* ── Master transport bar ─────────────────────── */}
            <div className="rounded-xl border border-gray-800 bg-surface-850/80 p-4 space-y-3">
                <div className="flex items-center gap-4">
                    {/* Play / Pause */}
                    <button
                        onClick={togglePlay}
                        disabled={!ready}
                        aria-label={playing ? "Pause all stems" : "Play all stems"}
                        className="
              w-11 h-11 rounded-full flex items-center justify-center shrink-0
              bg-gradient-to-br from-brand-600 to-brand-500 text-white
              hover:brightness-110 disabled:opacity-30
              shadow-lg shadow-brand-600/20 transition-all
            "
                    >
                        {playing ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4Zm8 0h4v16h-4V4Z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7L8 5Z" />
                            </svg>
                        )}
                    </button>

                    {/* Time display */}
                    <span className="text-xs text-gray-400 tabular-nums w-20 shrink-0">
                        {fmt(currentTime)} / {fmt(duration)}
                    </span>

                    {/* Seek bar */}
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.1"
                        value={seekPct}
                        onChange={handleSeek}
                        disabled={!ready}
                        className="flex-1 h-1.5 accent-brand-500 cursor-pointer"
                        aria-label="Seek position"
                    />

                    {/* Unmute all */}
                    <button
                        onClick={unmuteAll}
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap"
                        aria-label="Unmute all stems"
                    >
                        Unmute all
                    </button>
                </div>

                {!ready && (
                    <p className="text-xs text-gray-500 animate-pulse-slow">
                        Loading waveforms…
                    </p>
                )}
            </div>

            {/* ── Stem channels ───────────────────────────── */}
            <div className="space-y-2">
                {stems.map((stem, i) => {
                    const color = colorFor(stem.name);
                    const isMuted = effectiveMuted[i];
                    const isSolo = stemStates[i].solo;

                    return (
                        <div
                            key={stem.filename}
                            className={`
                rounded-xl border bg-surface-850/80 p-3
                flex items-center gap-3 transition-all duration-200
                ${isMuted ? "border-gray-800/60 opacity-50" : "border-gray-800"}
              `}
                        >
                            {/* Stem colour dot + name */}
                            <div className="flex items-center gap-2 w-24 shrink-0">
                                <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: color }}
                                />
                                <span className="text-sm font-medium text-gray-200 truncate">
                                    {stem.name}
                                </span>
                            </div>

                            {/* Mute button */}
                            <button
                                onClick={() => toggleMute(i)}
                                aria-label={`${isMuted ? "Unmute" : "Mute"} ${stem.name}`}
                                aria-pressed={stemStates[i].muted}
                                className={`
                  w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold
                  transition-colors shrink-0
                  ${stemStates[i].muted
                                        ? "bg-rose-600/30 text-rose-400 border border-rose-700/50"
                                        : "bg-surface-900 text-gray-400 border border-gray-700 hover:text-gray-200"
                                    }
                `}
                                title={stemStates[i].muted ? "Unmute" : "Mute"}
                            >
                                M
                            </button>

                            {/* Solo button */}
                            <button
                                onClick={() => toggleSolo(i)}
                                aria-label={`${isSolo ? "Unsolo" : "Solo"} ${stem.name}`}
                                aria-pressed={isSolo}
                                className={`
                  w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold
                  transition-colors shrink-0
                  ${isSolo
                                        ? "bg-amber-500/30 text-amber-400 border border-amber-600/50"
                                        : "bg-surface-900 text-gray-400 border border-gray-700 hover:text-gray-200"
                                    }
                `}
                                title={isSolo ? "Unsolo" : "Solo"}
                            >
                                S
                            </button>

                            {/* Volume slider */}
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={stemStates[i].volume}
                                onChange={(e) => setVolume(i, parseFloat(e.target.value))}
                                className="w-16 h-1 accent-gray-400 shrink-0"
                                aria-label={`${stem.name} volume`}
                            />

                            {/* Waveform */}
                            <div
                                ref={(el) => (containerRefs.current[i] = el)}
                                className="flex-1 min-w-0"
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
