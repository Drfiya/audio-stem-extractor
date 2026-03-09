"""
Upload router — receives an audio file upload and kicks off a separation job.
"""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Form, UploadFile

from config import settings
from models.schemas import (
    ErrorResponse,
    JobState,
    ModelChoice,
    OutputFormat,
    SeparationConfig,
    StemCount,
    StemInfo,
)
from services.separator import jobs, run_separation, _broadcast
from services.transcoder import transcode_batch

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["upload"])


async def _process_job(
    job_id: str,
    input_path: str,
    output_dir: str,
    config: SeparationConfig,
) -> None:
    """Background task: run separation → optional transcode → update job record."""
    try:
        # Analyse phase
        jobs[job_id]["state"] = JobState.ANALYZING
        jobs[job_id]["stage"] = "Analyzing audio…"
        await _broadcast(job_id, {
            "progress": 0,
            "stage": "Analyzing audio…",
            "eta_seconds": None,
        })

        # Separate
        stem_files = await run_separation(
            job_id=job_id,
            input_path=input_path,
            output_dir=output_dir,
            model=ModelChoice(config.model),
            stems=StemCount(config.stems),
        )

        # Transcode if MP3 requested
        if config.output_format == OutputFormat.MP3:
            jobs[job_id]["stage"] = "Transcoding to MP3…"
            await _broadcast(job_id, {
                "progress": 100,
                "stage": "Transcoding to MP3…",
                "eta_seconds": None,
            })
            mp3_files = await transcode_batch(stem_files)
            for wav in stem_files:
                wav.unlink(missing_ok=True)
            stem_files = mp3_files

        # Build stem info list
        stem_infos = []
        for f in stem_files:
            info = StemInfo(
                name=f.stem.replace("_", " ").title(),
                filename=f.name,
                size_bytes=f.stat().st_size,
                download_url=f"/api/stems/{job_id}/{f.name}",
            )
            stem_infos.append(info)

        jobs[job_id]["state"] = JobState.COMPLETED
        jobs[job_id]["progress"] = 100.0
        jobs[job_id]["stage"] = "Complete"
        jobs[job_id]["stems"] = [s.model_dump() for s in stem_infos]
        jobs[job_id]["zip_url"] = f"/api/stems/{job_id}/zip"

        await _broadcast(job_id, {
            "progress": 100,
            "stage": "Complete",
            "eta_seconds": 0,
        })
        logger.info("Job %s completed with %d stems", job_id, len(stem_infos))

    except Exception as exc:
        logger.exception("Job %s failed", job_id)
        jobs[job_id]["state"] = JobState.FAILED
        jobs[job_id]["error"] = str(exc)
        await _broadcast(job_id, {
            "progress": 0,
            "stage": "Failed",
            "eta_seconds": None,
            "error": str(exc),
        })


@router.post("/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    model: str = Form("demucs"),
    stems: int = Form(4),
    output_format: str = Form("wav"),
):
    """
    Accept an audio file upload.
    Returns a job_id that can be used to track progress and download results.
    """
    # ── Validate extension ───────────────────────────────
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in settings.get_allowed_extensions():
        return ErrorResponse(
            code="UNSUPPORTED_FORMAT",
            message=f"File type '.{ext}' is not supported. Allowed: {settings.get_allowed_extensions()}",
        )

    # ── Validate size (read into memory for small files, stream for large) ──
    contents = await file.read()
    if len(contents) > settings.max_file_size_bytes:
        return ErrorResponse(
            code="FILE_TOO_LARGE",
            message=f"File exceeds the {settings.max_file_size_mb} MB limit.",
        )

    # ── Save to disk ─────────────────────────────────────
    job_id = uuid.uuid4().hex[:12]
    job_upload_dir = Path(settings.upload_dir) / job_id
    job_upload_dir.mkdir(parents=True, exist_ok=True)
    input_path = job_upload_dir / (file.filename or f"upload.{ext}")

    with open(input_path, "wb") as f:
        f.write(contents)

    # ── Output directory ─────────────────────────────────
    job_output_dir = Path(settings.output_dir) / job_id
    job_output_dir.mkdir(parents=True, exist_ok=True)

    # ── Register the job ─────────────────────────────────
    config = SeparationConfig(
        model=ModelChoice(model),
        stems=StemCount(stems),
        output_format=OutputFormat(output_format),
    )

    jobs[job_id] = {
        "state": JobState.PENDING,
        "progress": 0.0,
        "stage": "Uploading…",
        "original_filename": file.filename or "",
        "stems": [],
        "error": None,
        "output_dir": str(job_output_dir),
        "zip_url": None,
    }

    # ── Kick off background processing ───────────────────
    background_tasks.add_task(
        _process_job,
        job_id=job_id,
        input_path=str(input_path),
        output_dir=str(job_output_dir),
        config=config,
    )

    logger.info(
        "Upload accepted: %s → job %s (model=%s, stems=%s, fmt=%s)",
        file.filename, job_id, model, stems, output_format,
    )

    return {"job_id": job_id}
