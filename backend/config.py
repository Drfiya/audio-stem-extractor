"""
Centralised configuration loaded from environment / .env file.
Uses pydantic-settings so every value can be overridden via env vars.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Paths ────────────────────────────────────────────
    upload_dir: str = "./tmp/uploads"
    output_dir: str = "./tmp/outputs"
    watch_dir: str = ""

    # ── Processing defaults ──────────────────────────────
    default_model: str = "demucs"        # "demucs" | "spleeter"
    default_stems: int = 4               # 2 | 4 | 6
    default_output_format: str = "wav"   # "wav" | "mp3"
    mp3_bitrate: int = 320               # kbps

    # ── Limits ───────────────────────────────────────────
    max_file_size_mb: int = 500
    max_duration_minutes: int = 30
    job_ttl_seconds: int = 3600          # 1 hour auto-cleanup

    # ── Server ───────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = '["http://localhost:5173"]'

    # ── Allowed audio extensions ─────────────────────────
    allowed_extensions: str = '["mp3","wav","flac","ogg","m4a","aac"]'

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }

    # -- helpers ----------------------------------------------------------

    def get_cors_origins(self) -> List[str]:
        return json.loads(self.cors_origins)

    def get_allowed_extensions(self) -> List[str]:
        return json.loads(self.allowed_extensions)

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    def ensure_dirs(self) -> None:
        """Create working directories if they don't exist."""
        Path(self.upload_dir).mkdir(parents=True, exist_ok=True)
        Path(self.output_dir).mkdir(parents=True, exist_ok=True)


# Singleton used across the app
settings = Settings()
