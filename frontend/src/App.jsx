/**
 * App — top-level orchestrator component.
 *
 * Manages the application state machine:
 *   idle → configuring → uploading → processing → results | error
 *
 * Composes all child components and drives the upload + progress flow.
 */

import React, { useCallback, useState } from "react";
import DropZone from "./components/DropZone";
import StemConfig from "./components/StemConfig";
import FolderLinker from "./components/FolderLinker";
import ProgressBar from "./components/ProgressBar";
import ResultsPanel from "./components/ResultsPanel";
import { useToast } from "./components/Toast";
import { useWebSocket } from "./hooks/useWebSocket";
import { useFolderWatcher } from "./hooks/useFolderWatcher";
import { uploadFile, getJobStatus } from "./utils/api";

/** Default separation config */
const DEFAULT_CONFIG = {
    model: "demucs",
    stems: 4,
    outputFormat: "wav",
};

export default function App() {
    // ── State ─────────────────────────────────────────────
    const [file, setFile] = useState(null);
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [jobId, setJobId] = useState(null);
    const [phase, setPhase] = useState("idle"); // idle | uploading | processing | results | error
    const [result, setResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [autoProcess, setAutoProcess] = useState(true);

    const { addToast } = useToast();
    const ws = useWebSocket(phase === "processing" ? jobId : null);
    const folder = useFolderWatcher();

    // ── Handlers ──────────────────────────────────────────

    const handleFileSelect = useCallback((f) => {
        setFile(f);
        setPhase("idle");
        setResult(null);
        setErrorMsg("");
    }, []);

    const handleConfigChange = useCallback((patch) => {
        setConfig((prev) => ({ ...prev, ...patch }));
    }, []);

    const handleStart = useCallback(async () => {
        if (!file) {
            addToast("Please select an audio file first.", "warning");
            return;
        }

        setPhase("uploading");
        setErrorMsg("");

        try {
            const { job_id } = await uploadFile(file, config);
            setJobId(job_id);
            setPhase("processing");
            addToast("Processing started!", "success");

            // Poll for completion (WebSocket handles real-time updates,
            // but we also poll as a fallback)
            const poll = setInterval(async () => {
                try {
                    const status = await getJobStatus(job_id);
                    if (status.state === "completed") {
                        clearInterval(poll);
                        setResult(status);
                        setPhase("results");
                        addToast("Stem separation complete!", "success");
                    } else if (status.state === "failed") {
                        clearInterval(poll);
                        setErrorMsg(status.error || "Processing failed.");
                        setPhase("error");
                        addToast("Processing failed.", "error");
                    }
                } catch {
                    // Ignore transient poll errors — WebSocket is primary
                }
            }, 3000);
        } catch (err) {
            setErrorMsg(err.message || "Upload failed.");
            setPhase("error");
            addToast(err.message || "Upload failed.", "error");
        }
    }, [file, config, addToast]);

    const handleRetry = useCallback(() => {
        setPhase("idle");
        setErrorMsg("");
        setResult(null);
        setJobId(null);
    }, []);

    // ── Derive progress from WebSocket ────────────────────
    const progress = ws.progress;
    const stage =
        phase === "uploading"
            ? "Uploading…"
            : ws.stage || "Waiting for model…";

    // ── Render ────────────────────────────────────────────
    return (
        <div className="min-h-screen flex flex-col">
            {/* ── Header ────────────────────────────────────── */}
            <header className="border-b border-gray-800/60 bg-surface-950/80 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        {/* Logo icon */}
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-accent-cyan flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-100">Stem Separator</h1>
                            <p className="text-xs text-gray-500">AI-powered audio splitting</p>
                        </div>
                    </div>

                    {/* Folder linker (header area) */}
                    <FolderLinker
                        supported={folder.supported}
                        folderName={folder.folderName}
                        isLinked={folder.isLinked}
                        autoProcess={autoProcess}
                        onAutoProcessChange={setAutoProcess}
                        onPickFolder={folder.pickFolder}
                        onUnlink={folder.unlinkFolder}
                    />
                </div>
            </header>

            {/* ── Main content ──────────────────────────────── */}
            <main className="flex-1 flex items-start justify-center px-4 py-10 md:py-16">
                <div className="w-full max-w-2xl space-y-8">
                    {/* Drop zone */}
                    <DropZone
                        file={file}
                        onFileSelect={handleFileSelect}
                        disabled={phase === "uploading" || phase === "processing"}
                    />

                    {/* Stem config (show when file selected and not yet processing) */}
                    {file && (phase === "idle" || phase === "error") && (
                        <div className="space-y-6">
                            <StemConfig config={config} onChange={handleConfigChange} />

                            {/* Start button */}
                            <button
                                onClick={handleStart}
                                className="
                  w-full py-3.5 rounded-xl
                  bg-gradient-to-r from-brand-600 to-brand-500
                  text-white font-bold text-base
                  shadow-lg shadow-brand-600/25
                  hover:shadow-brand-600/50 hover:brightness-110
                  active:scale-[0.98]
                  transition-all duration-200
                "
                                id="start-separation-btn"
                            >
                                Start Separation
                            </button>
                        </div>
                    )}

                    {/* Progress */}
                    {(phase === "uploading" || phase === "processing") && (
                        <div className="space-y-2">
                            <ProgressBar progress={progress} stage={stage} eta={ws.eta} />
                        </div>
                    )}

                    {/* Results */}
                    {phase === "results" && result && (
                        <ResultsPanel
                            stems={result.stems}
                            jobId={result.job_id}
                            zipUrl={result.zip_url}
                        />
                    )}

                    {/* Error */}
                    {phase === "error" && (
                        <div className="rounded-xl border border-rose-800/60 bg-rose-950/30 p-6 text-center space-y-3 animate-fade-in">
                            <p className="text-rose-300 font-medium">{errorMsg}</p>
                            <button
                                onClick={handleRetry}
                                className="
                  px-5 py-2 rounded-lg
                  bg-rose-600/30 border border-rose-700
                  text-rose-200 text-sm font-medium
                  hover:bg-rose-600/50 transition-colors
                "
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* ── Footer ────────────────────────────────────── */}
            <footer className="border-t border-gray-800/40 py-4 text-center text-xs text-gray-600">
                Powered by Demucs &amp; Spleeter · Built with React &amp; FastAPI
            </footer>
        </div>
    );
}
