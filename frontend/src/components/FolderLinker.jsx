/**
 * FolderLinker — UI for linking a local folder via the File System Access API.
 *
 * Shows a "Link Folder" button, the linked folder name + status badge,
 * and an auto-process toggle. Falls back gracefully in unsupported browsers.
 *
 * @param {{
 *   supported: boolean,
 *   folderName: string | null,
 *   isLinked: boolean,
 *   autoProcess: boolean,
 *   onAutoProcessChange: (val: boolean) => void,
 *   onPickFolder: () => void,
 *   onUnlink: () => void,
 * }} props
 */

import React from "react";

export default function FolderLinker({
    supported,
    folderName,
    isLinked,
    autoProcess,
    onAutoProcessChange,
    onPickFolder,
    onUnlink,
}) {
    if (!supported) {
        return (
            <div className="text-xs text-gray-600 flex items-center gap-2 mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                Local folder linking requires a Chromium-based browser.
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 flex-wrap animate-fade-in">
            {isLinked ? (
                <>
                    {/* Linked status */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-700/40">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow" />
                        <span className="text-sm text-emerald-300 font-medium">
                            {folderName}
                        </span>
                    </div>

                    {/* Auto-process toggle */}
                    <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={autoProcess}
                            onChange={(e) => onAutoProcessChange(e.target.checked)}
                            className="
                w-4 h-4 rounded border-gray-600
                bg-surface-850 text-brand-500
                focus:ring-brand-500/40 focus:ring-2 focus:ring-offset-0
                cursor-pointer
              "
                        />
                        Auto-process
                    </label>

                    {/* Unlink button */}
                    <button
                        onClick={onUnlink}
                        className="text-xs text-gray-500 hover:text-rose-400 transition-colors underline underline-offset-2"
                        aria-label="Unlink folder"
                    >
                        Unlink
                    </button>
                </>
            ) : (
                /* Link folder button */
                <button
                    onClick={onPickFolder}
                    className="
            flex items-center gap-2 px-4 py-2 rounded-xl
            bg-surface-850 border border-gray-700
            text-sm text-gray-300 font-medium
            hover:border-brand-500/50 hover:text-brand-400
            transition-all duration-200
          "
                    aria-label="Link a local folder for automatic stem separation"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                    </svg>
                    Link Local Folder
                </button>
            )}
        </div>
    );
}
