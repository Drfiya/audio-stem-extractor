/**
 * Toast — non-blocking notification system.
 *
 * Provides a ToastProvider (context) and a useToast() hook.
 * Toasts auto-dismiss after 4 seconds; can be manually closed.
 *
 * @example
 *   const { addToast } = useToast();
 *   addToast("Upload started", "success");
 */

import React, { createContext, useCallback, useContext, useState } from "react";

const ToastCtx = createContext(null);

let _nextId = 0;

/** @param {{ children: React.ReactNode }} props */
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = "info") => {
        const id = _nextId++;
        setToasts((prev) => [...prev, { id, message, type }]);
        // Auto-dismiss after 4 s
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastCtx.Provider value={{ addToast }}>
            {children}

            {/* Toast container — fixed bottom-right */}
            <div
                className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none"
                aria-live="polite"
            >
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        role="alert"
                        className={`
              pointer-events-auto animate-slide-up
              flex items-center gap-3 px-5 py-3 rounded-xl
              text-sm font-medium shadow-xl backdrop-blur-md
              border border-white/10
              ${t.type === "success" ? "bg-emerald-600/90 text-white" : ""}
              ${t.type === "error" ? "bg-rose-600/90 text-white" : ""}
              ${t.type === "info" ? "bg-surface-800/90 text-gray-100" : ""}
              ${t.type === "warning" ? "bg-amber-500/90 text-gray-900" : ""}
            `}
                    >
                        {/* Icon */}
                        <span className="text-lg" aria-hidden>
                            {t.type === "success" && "✓"}
                            {t.type === "error" && "✕"}
                            {t.type === "info" && "ℹ"}
                            {t.type === "warning" && "⚠"}
                        </span>

                        <span className="flex-1">{t.message}</span>

                        <button
                            onClick={() => removeToast(t.id)}
                            className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
                            aria-label="Dismiss notification"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </ToastCtx.Provider>
    );
}

/** @returns {{ addToast: (message: string, type?: "success"|"error"|"info"|"warning") => void }} */
export function useToast() {
    const ctx = useContext(ToastCtx);
    if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
    return ctx;
}
