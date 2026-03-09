"""
FFmpeg transcoder — converts WAV stems to MP3 at the configured bitrate.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from config import settings

logger = logging.getLogger(__name__)


async def transcode_to_mp3(wav_path: Path) -> Path:
    """
    Convert *wav_path* to MP3. Returns the path to the new .mp3 file.
    The original WAV is left in place so callers can decide whether to delete it.
    """
    mp3_path = wav_path.with_suffix(".mp3")

    cmd = [
        "ffmpeg", "-y",           # overwrite without asking
        "-i", str(wav_path),
        "-codec:a", "libmp3lame",
        "-b:a", f"{settings.mp3_bitrate}k",
        str(mp3_path),
    ]

    logger.info("Transcoding: %s → %s", wav_path.name, mp3_path.name)

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    if proc.returncode != 0:
        detail = stderr.decode("utf-8", errors="replace")[-300:]
        raise RuntimeError(f"ffmpeg failed (exit {proc.returncode}): {detail}")

    return mp3_path


async def transcode_batch(wav_paths: list[Path]) -> list[Path]:
    """Transcode a list of WAV files to MP3 concurrently."""
    tasks = [transcode_to_mp3(p) for p in wav_paths if p.suffix.lower() == ".wav"]
    return await asyncio.gather(*tasks)
