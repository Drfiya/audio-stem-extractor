"""
Jobs router — job status polling, WebSocket progress, stem downloads, ZIP export.
"""

from __future__ import annotations

import io
import logging
import zipfile
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, StreamingResponse

from config import settings
from models.schemas import ErrorResponse, JobState, JobStatus
from services.separator import jobs, subscribe, unsubscribe

logger = logging.getLogger(__name__)
router = APIRouter(tags=["jobs"])


# ── GET /api/jobs/{job_id} ──────────────────────────────

@router.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Return current status and stem list for the given job."""
    job = jobs.get(job_id)
    if job is None:
        return ErrorResponse(code="NOT_FOUND", message=f"Job {job_id} not found.")

    return JobStatus(
        job_id=job_id,
        state=job["state"],
        progress=job.get("progress", 0),
        stage=job.get("stage", ""),
        original_filename=job.get("original_filename", ""),
        stems=job.get("stems", []),
        error=job.get("error"),
        zip_url=job.get("zip_url"),
    )


# ── WS /ws/progress/{job_id} ───────────────────────────

@router.websocket("/ws/progress/{job_id}")
async def websocket_progress(ws: WebSocket, job_id: str):
    """
    Stream JSON progress updates to the client.

    The client connects here after receiving a job_id from /api/upload.
    Each message is a dict: { progress, stage, eta_seconds, ?error }.
    """
    await ws.accept()

    # If job already completed/failed, send final state immediately
    job = jobs.get(job_id)
    if job and job["state"] in (JobState.COMPLETED, JobState.FAILED):
        await ws.send_json({
            "progress": job.get("progress", 100),
            "stage": "Complete" if job["state"] == JobState.COMPLETED else "Failed",
            "eta_seconds": 0,
            "error": job.get("error"),
        })
        await ws.close()
        return

    q = subscribe(job_id)
    try:
        while True:
            data = await q.get()
            await ws.send_json(data)
            # Close after completion or failure
            if data.get("stage") in ("Complete", "Failed"):
                break
    except WebSocketDisconnect:
        logger.debug("WS client disconnected for job %s", job_id)
    finally:
        unsubscribe(job_id, q)


# ── GET /api/stems/{job_id}/{stem_name} ─────────────────

@router.get("/api/stems/{job_id}/{stem_name}")
async def download_stem(job_id: str, stem_name: str):
    """Download an individual stem file."""
    job = jobs.get(job_id)
    if job is None:
        return ErrorResponse(code="NOT_FOUND", message="Job not found.")

    output_dir = Path(job.get("output_dir", settings.output_dir))
    # Search recursively — Demucs nests output in model-name sub-folders
    matches = list(output_dir.rglob(stem_name))

    if not matches:
        return ErrorResponse(
            code="STEM_NOT_FOUND",
            message=f"Stem '{stem_name}' not found for job {job_id}.",
        )

    return FileResponse(
        path=str(matches[0]),
        filename=stem_name,
        media_type="application/octet-stream",
    )


# ── GET /api/stems/{job_id}/zip ─────────────────────────

@router.get("/api/stems/{job_id}/zip")
async def download_zip(job_id: str):
    """Package all stems for *job_id* into a ZIP and stream it."""
    job = jobs.get(job_id)
    if job is None:
        return ErrorResponse(code="NOT_FOUND", message="Job not found.")
    if job["state"] != JobState.COMPLETED:
        return ErrorResponse(code="NOT_READY", message="Job is not yet complete.")

    output_dir = Path(job.get("output_dir", settings.output_dir))
    stem_files = list(output_dir.rglob("*.wav")) + list(output_dir.rglob("*.mp3"))

    if not stem_files:
        return ErrorResponse(code="NO_STEMS", message="No stem files found.")

    # Build ZIP in memory
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in stem_files:
            zf.write(f, arcname=f.name)
    buf.seek(0)

    original = job.get("original_filename", "stems")
    base_name = Path(original).stem

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{base_name}_stems.zip"'
        },
    )
