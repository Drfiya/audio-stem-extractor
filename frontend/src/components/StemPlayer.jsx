/**
 * StemPlayer — inline audio player with WaveSurfer.js waveform.
 *
 * Renders a WaveSurfer waveform visualization for a single stem,
 * with play/pause controls and a duration display.
 *
 * @param {{
 *   url: string,           // audio file URL
 *   name: string,          // stem name, e.g. "Vocals"
 *   color?: string,        // waveform colour (CSS)
 * }} props
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

const DEFAULT_COLOR = "#8b5cf6";

export default function StemPlayer({ url, name, color = DEFAULT_COLOR }) {
    const containerRef = useRef(null);
    const wsRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrent] = useState(0);
    const [ready, setReady] = useState(false);

    // Initialise WaveSurfer once on mount
    useEffect(() => {
        if (!containerRef.current) return;

        const ws = WaveSurfer.create({
            container: containerRef.current,
            waveColor: `${color}66`,      // semi-transparent
            progressColor: color,
            cursorColor: "#22d3ee",
            barWidth: 2,
            barGap: 1.5,
            barRadius: 2,
            height: 48,
            normalize: true,
            backend: "WebAudio",
        });

        ws.load(url);

        ws.on("ready", () => {
            setDuration(ws.getDuration());
            setReady(true);
        });

        ws.on("audioprocess", () => {
            setCurrent(ws.getCurrentTime());
        });

        ws.on("finish", () => setPlaying(false));

        wsRef.current = ws;

        return () => {
            ws.destroy();
        };
    }, [url, color]);

    const togglePlay = useCallback(() => {
        if (!wsRef.current) return;
        wsRef.current.playPause();
        setPlaying((p) => !p);
    }, []);

    /** mm:ss formatter */
    const fmt = (s) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    return (
        <div className="flex items-center gap-3">
            {/* Play / Pause */}
            <button
                onClick={togglePlay}
                disabled={!ready}
                aria-label={playing ? `Pause ${name}` : `Play ${name}`}
                className="
          w-9 h-9 rounded-full flex items-center justify-center shrink-0
          bg-brand-600/30 text-brand-400 hover:bg-brand-600/50
          disabled:opacity-30 transition-colors
        "
            >
                {playing ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4Zm8 0h4v16h-4V4Z" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7L8 5Z" />
                    </svg>
                )}
            </button>

            {/* Waveform */}
            <div ref={containerRef} className="flex-1 min-w-0" />

            {/* Duration */}
            <span className="text-xs text-gray-500 tabular-nums shrink-0 w-20 text-right">
                {ready ? `${fmt(currentTime)} / ${fmt(duration)}` : "Loading…"}
            </span>
        </div>
    );
}
