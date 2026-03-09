"""
FastAPI application entry point.

Registers routers, CORS middleware, and lifecycle hooks
for directory creation and background cleanup.
"""

from __future__ import annotations

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from services.separator import jobs
from services.watcher import stop_watcher

# ── Logging ──────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("logs/server.log", mode="a"),
    ],
)
logger = logging.getLogger(__name__)


# ── Cleanup task ─────────────────────────────────────────

async def _cleanup_loop() -> None:
    """
    Periodically remove expired jobs and their files.
    Runs once per minute; deletes anything older than JOB_TTL_SECONDS.
    """
    while True:
        await asyncio.sleep(60)
        now = time.time()
        expired = [
            jid for jid, data in jobs.items()
            if data.get("created_at", now) + settings.job_ttl_seconds < now
        ]
        for jid in expired:
            job = jobs.pop(jid, None)
            if job:
                # Clean upload + output dirs
                for d in (
                    Path(settings.upload_dir) / jid,
                    Path(settings.output_dir) / jid,
                ):
                    if d.exists():
                        for f in d.rglob("*"):
                            f.unlink(missing_ok=True)
                        d.rmdir()
                logger.info("Cleaned up expired job %s", jid)


# ── Lifespan ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hooks."""
    # Ensure working directories exist
    settings.ensure_dirs()
    Path("logs").mkdir(exist_ok=True)

    # Start background cleanup
    cleanup_task = asyncio.create_task(_cleanup_loop())
    logger.info("Audio Stem Separator backend started on %s:%s", settings.host, settings.port)

    yield  # ← app is running

    # Shutdown
    cleanup_task.cancel()
    stop_watcher()
    logger.info("Backend shutting down.")


# ── App ──────────────────────────────────────────────────

app = FastAPI(
    title="Audio Stem Separator",
    version="1.0.0",
    description="AI-powered stem separation API (Demucs / Spleeter)",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
from routers.upload import router as upload_router  # noqa: E402
from routers.jobs import router as jobs_router      # noqa: E402
from routers.folder import router as folder_router  # noqa: E402

app.include_router(upload_router)
app.include_router(jobs_router)
app.include_router(folder_router)


@app.get("/")
async def health():
    return {"status": "ok", "service": "audio-stem-separator"}
