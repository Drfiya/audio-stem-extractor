"""
Pydantic models shared across routers and services.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────

class ModelChoice(str, Enum):
    DEMUCS = "demucs"
    SPLEETER = "spleeter"


class StemCount(int, Enum):
    TWO = 2
    FOUR = 4
    SIX = 6


class OutputFormat(str, Enum):
    WAV = "wav"
    MP3 = "mp3"


class JobState(str, Enum):
    PENDING = "pending"
    UPLOADING = "uploading"
    ANALYZING = "analyzing"
    SEPARATING = "separating"
    FINALIZING = "finalizing"
    COMPLETED = "completed"
    FAILED = "failed"


# ── Request / Config ────────────────────────────────────

class SeparationConfig(BaseModel):
    """Options the client sends alongside an upload."""
    model: ModelChoice = ModelChoice.DEMUCS
    stems: StemCount = StemCount.FOUR
    output_format: OutputFormat = OutputFormat.WAV


class FolderWatchRequest(BaseModel):
    """Body for POST /api/folder/watch."""
    path: str = Field(..., description="Absolute path to the folder to monitor")
    auto_process: bool = True
    config: SeparationConfig = SeparationConfig()


# ── Stem info ────────────────────────────────────────────

class StemInfo(BaseModel):
    name: str
    filename: str
    size_bytes: int
    download_url: str


# ── Job status ───────────────────────────────────────────

class JobStatus(BaseModel):
    job_id: str
    state: JobState
    progress: float = Field(0.0, ge=0.0, le=100.0)
    stage: str = ""
    eta_seconds: Optional[float] = None
    original_filename: str = ""
    stems: List[StemInfo] = []
    error: Optional[str] = None
    zip_url: Optional[str] = None


# ── Progress update (WebSocket payload) ──────────────────

class ProgressUpdate(BaseModel):
    job_id: str
    progress: float
    stage: str
    eta_seconds: Optional[float] = None


# ── Error response ───────────────────────────────────────

class ErrorResponse(BaseModel):
    error: bool = True
    code: str
    message: str
