"""
Local folder watcher — monitors a directory for new audio files using watchdog.

When a new audio file lands in the watched folder:
  1. Wait 2 seconds (debounce) so the file write completes.
  2. Create a job in the shared registry.
  3. Trigger the separation pipeline.
  4. Save outputs into a "stems/" sub-folder inside the watched directory.
"""

from __future__ import annotations

import asyncio
import logging
import threading
import uuid
from pathlib import Path
from typing import Optional

from watchdog.events import FileSystemEventHandler, FileCreatedEvent
from watchdog.observers import Observer

from config import settings
from models.schemas import (
    JobState,
    ModelChoice,
    OutputFormat,
    SeparationConfig,
    StemCount,
)
from services.separator import jobs, run_separation
from services.transcoder import transcode_batch

logger = logging.getLogger(__name__)

DEBOUNCE_SECONDS = 2.0


class _AudioFileHandler(FileSystemEventHandler):
    """Watchdog handler that queues new audio files for processing."""

    def __init__(
        self,
        loop: asyncio.AbstractEventLoop,
        config: SeparationConfig,
        auto_process: bool = True,
    ):
        super().__init__()
        self.loop = loop
        self.config = config
        self.auto_process = auto_process
        self._seen: set[str] = set()

    def on_created(self, event: FileCreatedEvent) -> None:  # type: ignore[override]
        if event.is_directory:
            return

        path = Path(event.src_path)
        ext = path.suffix.lstrip(".").lower()

        if ext not in settings.get_allowed_extensions():
            return
        if str(path) in self._seen:
            return

        self._seen.add(str(path))

        if not self.auto_process:
            logger.info("Auto-process disabled — skipping %s", path.name)
            return

        # Schedule the async pipeline on the main event loop
        asyncio.run_coroutine_threadsafe(
            _process_watched_file(path, self.config),
            self.loop,
        )


async def _process_watched_file(path: Path, config: SeparationConfig) -> None:
    """Debounce then run separation for a file found in the watched folder."""
    await asyncio.sleep(DEBOUNCE_SECONDS)

    job_id = uuid.uuid4().hex[:12]
    stems_dir = path.parent / "stems" / path.stem
    stems_dir.mkdir(parents=True, exist_ok=True)

    jobs[job_id] = {
        "state": JobState.ANALYZING,
        "progress": 0.0,
        "stage": "Analyzing audio…",
        "original_filename": path.name,
        "stems": [],
        "error": None,
    }

    logger.info("Watcher: processing %s as job %s", path.name, job_id)

    try:
        stem_files = await run_separation(
            job_id=job_id,
            input_path=str(path),
            output_dir=str(stems_dir),
            model=ModelChoice(config.model),
            stems=StemCount(config.stems),
        )

        # Optionally transcode to MP3
        if config.output_format == OutputFormat.MP3:
            mp3_files = await transcode_batch(stem_files)
            # Remove original WAVs after successful transcode
            for wav in stem_files:
                wav.unlink(missing_ok=True)
            stem_files = mp3_files

        jobs[job_id]["state"] = JobState.COMPLETED
        jobs[job_id]["stems"] = [
            {"name": f.stem, "filename": f.name, "size_bytes": f.stat().st_size}
            for f in stem_files
        ]
        logger.info("Watcher: job %s completed (%d stems)", job_id, len(stem_files))

    except Exception as exc:
        logger.exception("Watcher: job %s failed", job_id)
        jobs[job_id]["state"] = JobState.FAILED
        jobs[job_id]["error"] = str(exc)


# ── Watcher lifecycle ───────────────────────────────────

_observer: Optional[Observer] = None
_handler: Optional[_AudioFileHandler] = None


def start_watcher(
    folder: str,
    loop: asyncio.AbstractEventLoop,
    config: SeparationConfig,
    auto_process: bool = True,
) -> str:
    """Start watching *folder*. Returns the absolute path being watched."""
    global _observer, _handler

    stop_watcher()  # ensure clean state

    target = Path(folder).resolve()
    if not target.is_dir():
        raise FileNotFoundError(f"Directory not found: {target}")

    _handler = _AudioFileHandler(loop, config, auto_process)
    _observer = Observer()
    _observer.schedule(_handler, str(target), recursive=False)
    _observer.start()

    logger.info("Watching folder: %s", target)
    return str(target)


def stop_watcher() -> None:
    """Stop any running folder watcher."""
    global _observer, _handler
    if _observer is not None:
        _observer.stop()
        _observer.join(timeout=5)
        _observer = None
        _handler = None
        logger.info("Folder watcher stopped.")


def is_watching() -> bool:
    return _observer is not None and _observer.is_alive()
