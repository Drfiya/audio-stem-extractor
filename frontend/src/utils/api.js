/**
 * API utility — thin wrappers around fetch for the backend endpoints.
 *
 * Every function returns a parsed JSON response or throws an Error
 * with the server's error message when the request fails.
 */

const BASE = ""; // Vite proxy forwards /api → backend

/**
 * Upload an audio file with separation settings.
 * @param {File} file
 * @param {{ model: string, stems: number, outputFormat: string }} options
 * @returns {Promise<{ job_id: string }>}
 */
export async function uploadFile(file, { model, stems, outputFormat }) {
    const form = new FormData();
    form.append("file", file);
    form.append("model", model);
    form.append("stems", String(stems));
    form.append("output_format", outputFormat);

    const res = await fetch(`${BASE}/api/upload`, { method: "POST", body: form });
    const data = await res.json();

    if (data.error) throw new Error(data.message || "Upload failed");
    return data;
}

/**
 * Poll job status.
 * @param {string} jobId
 * @returns {Promise<import("../../backend/models/schemas").JobStatus>}
 */
export async function getJobStatus(jobId) {
    const res = await fetch(`${BASE}/api/jobs/${jobId}`);
    const data = await res.json();
    if (data.error) throw new Error(data.message);
    return data;
}

/**
 * Build the download URL for a single stem.
 * @param {string} jobId
 * @param {string} stemFilename
 */
export function getStemUrl(jobId, stemFilename) {
    return `${BASE}/api/stems/${jobId}/${stemFilename}`;
}

/**
 * Build the ZIP download URL.
 * @param {string} jobId
 */
export function getZipUrl(jobId) {
    return `${BASE}/api/stems/${jobId}/zip`;
}

/**
 * Ask the backend to start watching a local folder.
 * @param {string} path
 * @param {boolean} autoProcess
 * @param {{ model: string, stems: number, output_format: string }} config
 */
export async function watchFolder(path, autoProcess, config) {
    const res = await fetch(`${BASE}/api/folder/watch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, auto_process: autoProcess, config }),
    });
    return res.json();
}

/**
 * Stop the folder watcher.
 */
export async function unwatchFolder() {
    const res = await fetch(`${BASE}/api/folder/watch`, { method: "DELETE" });
    return res.json();
}

/**
 * Format file size as a human-readable string.
 * @param {number} bytes
 */
export function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
