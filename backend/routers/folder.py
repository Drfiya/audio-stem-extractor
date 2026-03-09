"""
Folder watcher router — start / stop watching a local directory for new audio files.
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter

from models.schemas import ErrorResponse, FolderWatchRequest, SeparationConfig
from services.watcher import is_watching, start_watcher, stop_watcher

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/folder", tags=["folder"])


@router.post("/watch")
async def watch_folder(body: FolderWatchRequest):
    """Start watching a local folder for new audio files."""
    try:
        loop = asyncio.get_running_loop()
        watched = start_watcher(
            folder=body.path,
            loop=loop,
            config=body.config,
            auto_process=body.auto_process,
        )
        return {
            "watching": True,
            "path": watched,
            "auto_process": body.auto_process,
        }
    except FileNotFoundError as exc:
        return ErrorResponse(code="DIR_NOT_FOUND", message=str(exc))
    except Exception as exc:
        logger.exception("Failed to start folder watcher")
        return ErrorResponse(code="WATCHER_ERROR", message=str(exc))


@router.delete("/watch")
async def unwatch_folder():
    """Stop the folder watcher."""
    stop_watcher()
    return {"watching": False}


@router.get("/watch")
async def watcher_status():
    """Check if the folder watcher is currently active."""
    return {"watching": is_watching()}
