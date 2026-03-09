"""
Stem separation service — orchestrates Demucs or Spleeter as an async subprocess.

Key responsibilities:
  • Build the correct CLI command for the selected model + stem count.
  • Stream stdout/stderr and parse progress percentages.
  • Push progress updates into a shared dict so the WebSocket router can relay them.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import sys
import time
from pathlib import Path
from typing import Dict, Optional

from models.schemas import JobState, ModelChoice, StemCount

logger = logging.getLogger(__name__)

# ── Shared state ────────────────────────────────────────
# In-memory job registry.  In production you'd use Redis or a DB.
jobs: Dict[str, dict] = {}

# Subscribers waiting for progress updates: job_id -> list[asyncio.Queue]
progress_subscribers: Dict[str, list] = {}


def subscribe(job_id: str) -> asyncio.Queue:
    """Register a new progress listener for *job_id*."""
    q: asyncio.Queue = asyncio.Queue()
    progress_subscribers.setdefault(job_id, []).append(q)
    return q


def unsubscribe(job_id: str, q: asyncio.Queue) -> None:
    """Remove a progress listener."""
    subs = progress_subscribers.get(job_id, [])
    if q in subs:
        subs.remove(q)


async def _broadcast(job_id: str, data: dict) -> None:
    """Push a progress dict to every subscriber of *job_id*."""
    for q in progress_subscribers.get(job_id, []):
        await q.put(data)


# ── Command builders ────────────────────────────────────

def _build_demucs_cmd(
    input_path: str,
    output_dir: str,
    stems: StemCount,
) -> list[str]:
    """Return the demucs CLI args for the requested stem count."""
    # Use the current interpreter so we stay inside the venv
    cmd = [sys.executable, "-m", "demucs"]

    if stems == StemCount.TWO:
        cmd += ["-n", "htdemucs", "--two-stems", "vocals"]
    elif stems == StemCount.SIX:
        cmd += ["-n", "htdemucs_6s"]
    else:  # default 4
        cmd += ["-n", "htdemucs"]

    cmd += ["-o", output_dir, input_path]
    return cmd


def _build_spleeter_cmd(
    input_path: str,
    output_dir: str,
    stems: StemCount,
) -> list[str]:
    """Return the spleeter CLI args.  Only 2/4/5 stems supported."""
    stem_map = {2: "2stems", 4: "4stems", 6: "5stems"}
    preset = stem_map.get(stems.value, "4stems")
    return [
        "spleeter", "separate",
        "-p", f"spleeter:{preset}",
        "-o", output_dir,
        input_path,
    ]


# ── Progress parser ─────────────────────────────────────

# Demucs / tqdm prints lines like "  3%|▎         | 1/30 [00:02<01:00, ...]"
_DEMUCS_PCT_RE = re.compile(r"(\d+)%\|")
# Spleeter is less verbose — we estimate by watching file creation.
_SPLEETER_STEP_RE = re.compile(r"INFO:spleeter")


def _parse_progress(line: str, model: ModelChoice) -> Optional[float]:
    """Try to extract a progress percentage from a log line."""
    if model == ModelChoice.DEMUCS:
        m = _DEMUCS_PCT_RE.search(line)
        if m:
            return float(m.group(1))
    return None


# ── Main separation logic ───────────────────────────────

async def run_separation(
    job_id: str,
    input_path: str,
    output_dir: str,
    model: ModelChoice,
    stems: StemCount,
) -> list[Path]:
    """
    Execute the stem separation model and return a list of output stem paths.

    Raises RuntimeError on model failure.
    """
    # Build command
    if model == ModelChoice.DEMUCS:
        cmd = _build_demucs_cmd(input_path, output_dir, stems)
    else:
        cmd = _build_spleeter_cmd(input_path, output_dir, stems)

    logger.info("Running: %s", " ".join(cmd))

    # Update job state
    jobs[job_id]["state"] = JobState.SEPARATING
    jobs[job_id]["progress"] = 0.0
    await _broadcast(job_id, {
        "progress": 0.0,
        "stage": "Separating stems…",
        "eta_seconds": None,
    })

    start_time = time.time()

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**os.environ, "PYTHONUNBUFFERED": "1"},
        )
    except FileNotFoundError:
        raise RuntimeError(
            f"Model binary not found. Is '{model.value}' installed?"
        )

    # Read stderr in chunks — tqdm uses \r (carriage return) for progress,
    # not \n, so readline() would block until the process finishes.
    last_pct = 0.0
    buffer = ""
    while True:
        chunk = await proc.stderr.read(1024)  # type: ignore[union-attr]
        if not chunk:
            break
        buffer += chunk.decode("utf-8", errors="replace")

        # Split on both \r and \n to catch tqdm output
        segments = re.split(r"[\r\n]+", buffer)
        # Keep the last incomplete segment in the buffer
        buffer = segments[-1]

        for segment in segments[:-1]:
            segment = segment.strip()
            if not segment:
                continue
            logger.debug("[%s] %s", model.value, segment)

            pct = _parse_progress(segment, model)
            if pct is not None and pct > last_pct:
                last_pct = pct
                elapsed = time.time() - start_time
                eta = (elapsed / max(pct, 1)) * (100 - pct) if pct > 0 else None
                jobs[job_id]["progress"] = pct
                await _broadcast(job_id, {
                    "progress": pct,
                    "stage": "Separating stems…",
                    "eta_seconds": round(eta, 1) if eta else None,
                })

    await proc.wait()

    if proc.returncode != 0:
        stdout_tail = (await proc.stdout.read()).decode()  # type: ignore[union-attr]
        raise RuntimeError(
            f"{model.value} exited with code {proc.returncode}: {stdout_tail[-500:]}"
        )

    # Locate output files
    output_base = Path(output_dir)
    stem_files = sorted(output_base.rglob("*.wav")) + sorted(output_base.rglob("*.mp3"))
    if not stem_files:
        raise RuntimeError("Model completed but no output files were found.")

    # Final broadcast
    jobs[job_id]["progress"] = 100.0
    jobs[job_id]["state"] = JobState.FINALIZING
    await _broadcast(job_id, {
        "progress": 100.0,
        "stage": "Finalizing…",
        "eta_seconds": 0,
    })

    return stem_files

