/**
 * useFolderWatcher — custom hook for the File System Access API.
 *
 * Wraps window.showDirectoryPicker() to let users link a local folder.
 * Falls back gracefully when the browser doesn't support the API.
 *
 * @returns {{
 *   supported: boolean,
 *   folderName: string|null,
 *   isLinked: boolean,
 *   pickFolder: () => Promise<void>,
 *   unlinkFolder: () => void,
 * }}
 */

import { useCallback, useState } from "react";

export function useFolderWatcher() {
    const supported = typeof window.showDirectoryPicker === "function";
    const [folderName, setFolderName] = useState(null);
    const [handle, setHandle] = useState(null);

    const pickFolder = useCallback(async () => {
        if (!supported) return;
        try {
            const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
            setHandle(dirHandle);
            setFolderName(dirHandle.name);
        } catch (err) {
            // User cancelled the picker — not an error
            if (err.name !== "AbortError") {
                console.error("Folder picker error:", err);
            }
        }
    }, [supported]);

    const unlinkFolder = useCallback(() => {
        setHandle(null);
        setFolderName(null);
    }, []);

    return {
        supported,
        folderName,
        isLinked: handle !== null,
        pickFolder,
        unlinkFolder,
    };
}
