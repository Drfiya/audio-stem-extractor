/**
 * DropZone — drag-and-drop (+ click-to-browse) audio file upload area.
 *
 * States: idle → dragover → file-selected.
 * Only accepts audio MIME types; fires a toast on invalid files.
 *
 * @param {{
 *   file: File | null,
 *   onFileSelect: (file: File) => void,
 *   disabled: boolean,
 * }} props
 */

import React, { useCallback, useRef, useState } from "react";
import { useToast } from "./Toast";
import { formatSize } from "../utils/api";

const ACCEPTED_TYPES = [
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/flac",
    "audio/ogg",
    "audio/mp4",
    "audio/x-m4a",
    "audio/aac",
];

const ACCEPTED_EXTS = ["mp3", "wav", "flac", "ogg", "m4a", "aac"];

export default function DropZone({ file, onFileSelect, disabled = false }) {
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef(null);
    const { addToast } = useToast();

    /** Validate and forward the file. */
    const handleFile = useCallback(
        (f) => {
            const ext = (f.name || "").split(".").pop().toLowerCase();
            if (!ACCEPTED_TYPES.includes(f.type) && !ACCEPTED_EXTS.includes(ext)) {
                addToast(`"${f.name}" is not a supported audio format.`, "error");
                return;
            }
            onFileSelect(f);
            addToast(`Selected: ${f.name}`, "success");
        },
        [onFileSelect, addToast]
    );

    const onDragOver = (e) => {
        e.preventDefault();
        if (!disabled) setDragActive(true);
    };
    const onDragLeave = () => setDragActive(false);

    const onDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (disabled) return;
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
    };

    const onBrowse = () => inputRef.current?.click();

    const onInputChange = (e) => {
        const f = e.target.files?.[0];
        if (f) handleFile(f);
    };

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label="Drop an audio file here or click to browse"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={!disabled ? onBrowse : undefined}
            onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !disabled) onBrowse();
            }}
            className={`
        relative group cursor-pointer select-none
        rounded-2xl border-2 border-dashed transition-all duration-300
        flex flex-col items-center justify-center gap-4
        p-10 md:p-14
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${dragActive
                    ? "dropzone-active border-brand-500"
                    : "border-gray-700 hover:border-brand-400"
                }
        bg-surface-900/60 backdrop-blur-sm
      `}
        >
            {/* Hidden file input */}
            <input
                ref={inputRef}
                type="file"
                accept="audio/*"
                className="sr-only"
                onChange={onInputChange}
                aria-hidden
            />

            {/* Icon */}
            <div
                className={`
          w-16 h-16 rounded-full
          flex items-center justify-center
          bg-brand-600/20 text-brand-400
          transition-transform duration-300
          ${dragActive ? "scale-110" : "group-hover:scale-105"}
        `}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-8 h-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775
               5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752
               3.752 0 0 1 18 19.5H6.75Z"
                    />
                </svg>
            </div>

            {/* Text */}
            {file ? (
                <div className="text-center animate-fade-in">
                    <p className="text-lg font-semibold text-gray-100 truncate max-w-xs">
                        {file.name}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        {formatSize(file.size)} · {file.name.split(".").pop().toUpperCase()}
                    </p>
                </div>
            ) : (
                <div className="text-center">
                    <p className="text-lg font-semibold text-gray-200">
                        Drop your audio file here
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        or{" "}
                        <span className="text-brand-400 underline underline-offset-2">
                            browse files
                        </span>
                    </p>
                    <p className="text-xs text-gray-600 mt-3">
                        MP3 · WAV · FLAC · OGG · M4A · AAC — up to 500 MB
                    </p>
                </div>
            )}
        </div>
    );
}
