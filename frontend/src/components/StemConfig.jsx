/**
 * StemConfig — separation settings panel.
 *
 * Lets the user choose:
 *   - Stem count (2 / 4 / 6) via segmented control
 *   - Model (Demucs / Spleeter) via dropdown with tooltip
 *   - Output format (WAV / MP3) via toggle
 *
 * @param {{
 *   config: { model: string, stems: number, outputFormat: string },
 *   onChange: (patch: Partial<config>) => void,
 * }} props
 */

import React from "react";

const STEM_OPTIONS = [
    { value: 2, label: "2 Stems", sub: "Vocals + Instrumental" },
    { value: 4, label: "4 Stems", sub: "Vocals · Drums · Bass · Other" },
    { value: 6, label: "6 Stems", sub: "Vocals · Drums · Bass · Guitar · Piano · Other" },
];

const MODELS = [
    {
        value: "demucs",
        label: "Demucs (htdemucs)",
        tip: "Best quality — Meta's hybrid transformer. Slower, needs more RAM.",
    },
    {
        value: "spleeter",
        label: "Spleeter",
        tip: "Faster & lighter — Deezer's model. Lower fidelity on complex mixes.",
    },
];

export default function StemConfig({ config, onChange }) {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* ── Stem count selector ─────────────────────────── */}
            <fieldset>
                <legend className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Separation Mode
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {STEM_OPTIONS.map((opt) => {
                        const active = config.stems === opt.value;
                        return (
                            <label
                                key={opt.value}
                                className={`
                  relative flex flex-col items-center gap-1.5 p-4 rounded-xl cursor-pointer
                  border transition-all duration-200
                  ${active
                                        ? "border-brand-500 bg-brand-600/15 shadow-lg shadow-brand-600/10"
                                        : "border-gray-700/60 bg-surface-850 hover:border-gray-600"
                                    }
                `}
                            >
                                <input
                                    type="radio"
                                    name="stems"
                                    value={opt.value}
                                    checked={active}
                                    onChange={() => onChange({ stems: opt.value })}
                                    className="sr-only"
                                />
                                <span
                                    className={`text-base font-bold ${active ? "text-brand-400" : "text-gray-200"
                                        }`}
                                >
                                    {opt.label}
                                </span>
                                <span className="text-xs text-gray-500 text-center leading-tight">
                                    {opt.sub}
                                </span>
                                {active && (
                                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-400" />
                                )}
                            </label>
                        );
                    })}
                </div>
            </fieldset>

            {/* ── Model + Output format row ───────────────────── */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Model selector */}
                <div className="flex-1">
                    <label
                        htmlFor="model-select"
                        className="block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2"
                    >
                        Model
                    </label>
                    <select
                        id="model-select"
                        value={config.model}
                        onChange={(e) => onChange({ model: e.target.value })}
                        className="
              w-full px-4 py-2.5 rounded-xl
              bg-surface-850 border border-gray-700 text-gray-100
              focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500
              transition-colors cursor-pointer
            "
                    >
                        {MODELS.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1.5">
                        {MODELS.find((m) => m.value === config.model)?.tip}
                    </p>
                </div>

                {/* Output format toggle */}
                <div className="sm:w-44">
                    <span className="block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Output
                    </span>
                    <div className="flex rounded-xl overflow-hidden border border-gray-700">
                        {["wav", "mp3"].map((fmt) => {
                            const active = config.outputFormat === fmt;
                            return (
                                <button
                                    key={fmt}
                                    onClick={() => onChange({ outputFormat: fmt })}
                                    className={`
                    flex-1 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors
                    ${active
                                            ? "bg-brand-600 text-white"
                                            : "bg-surface-850 text-gray-400 hover:text-gray-200"
                                        }
                  `}
                                    aria-pressed={active}
                                >
                                    {fmt}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                        {config.outputFormat === "wav" ? "Lossless quality" : "Smaller file size"}
                    </p>
                </div>
            </div>
        </div>
    );
}
