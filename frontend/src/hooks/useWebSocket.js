/**
 * useWebSocket — custom React hook for real-time progress streaming.
 *
 * Connects to /ws/progress/{jobId} and returns reactive progress data.
 * Auto-reconnects up to 3 times on disconnect.
 *
 * @param {string|null} jobId — null = don't connect
 * @returns {{ progress: number, stage: string, eta: number|null, error: string|null, connected: boolean }}
 */

import { useCallback, useEffect, useRef, useState } from "react";

export function useWebSocket(jobId) {
    const [state, setState] = useState({
        progress: 0,
        stage: "",
        eta: null,
        error: null,
        connected: false,
    });

    const wsRef = useRef(null);
    const retriesRef = useRef(0);
    const MAX_RETRIES = 3;

    const connect = useCallback(() => {
        if (!jobId) return;

        // Build WebSocket URL relative to current host
        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        const url = `${proto}//${window.location.host}/ws/progress/${jobId}`;

        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            retriesRef.current = 0;
            setState((s) => ({ ...s, connected: true }));
        };

        ws.onmessage = (evt) => {
            try {
                const data = JSON.parse(evt.data);
                setState({
                    progress: data.progress ?? 0,
                    stage: data.stage ?? "",
                    eta: data.eta_seconds ?? null,
                    error: data.error ?? null,
                    connected: true,
                });
            } catch {
                // Ignore malformed messages
            }
        };

        ws.onerror = () => {
            setState((s) => ({ ...s, connected: false }));
        };

        ws.onclose = () => {
            setState((s) => ({ ...s, connected: false }));

            // Auto-reconnect if we haven't exhausted retries
            if (retriesRef.current < MAX_RETRIES) {
                retriesRef.current += 1;
                setTimeout(connect, 1500 * retriesRef.current);
            }
        };
    }, [jobId]);

    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connect]);

    return state;
}
