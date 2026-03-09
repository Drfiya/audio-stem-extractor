# Audio Stem Separator

AI-powered audio stem separation tool — isolate vocals, drums, bass, guitar, piano, and more from any song.

Built with **React 18 + Tailwind v4** (frontend) and **Python FastAPI** (backend), powered by [Demucs](https://github.com/facebookresearch/demucs) and [Spleeter](https://github.com/deezer/spleeter).

---

## Features

- **Drag-and-drop upload** — MP3, WAV, FLAC, OGG, M4A, AAC (up to 500 MB)
- **2 / 4 / 6 stem separation** with model selection (Demucs or Spleeter)
- **Real-time progress** via WebSocket with ETA
- **Inline waveform players** (WaveSurfer.js) for each stem
- **Individual + ZIP downloads**
- **Local folder watcher** — auto-process new audio files dropped into a linked directory
- **Dark-theme UI** with animations and responsive layout

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10+ |
| Node.js | 18+ |
| ffmpeg | any recent |
| Demucs | `pip install demucs` |
| Spleeter (optional) | `pip install spleeter` |

> **Note:** Demucs pulls in PyTorch (~2 GB). Spleeter pulls in TensorFlow. Install only the model(s) you plan to use.

---

## Quick Start

### 1. Clone & configure

```bash
cp .env.example backend/.env
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install demucs          # or: pip install spleeter

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API is now running at `http://localhost:8000` — Swagger docs at `/docs`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Docker (optional)

```bash
docker-compose up --build
```

Frontend: `http://localhost:5173` · Backend: `http://localhost:8000`

---

## Project Structure

```
audio-stem-separator/
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main orchestrator
│   │   ├── main.jsx             # Entry point
│   │   ├── components/          # UI components
│   │   ├── hooks/               # useWebSocket, useFolderWatcher
│   │   ├── utils/api.js         # API helpers
│   │   └── styles/index.css     # Tailwind v4 + custom theme
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── backend/
│   ├── main.py                  # FastAPI app
│   ├── config.py                # Env-based settings
│   ├── routers/                 # upload, jobs, folder
│   ├── services/                # separator, transcoder, watcher
│   ├── models/schemas.py        # Pydantic models
│   └── requirements.txt
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload` | Upload audio file, returns `job_id` |
| `GET` | `/api/jobs/{job_id}` | Poll job status |
| `WS` | `/ws/progress/{job_id}` | Real-time progress stream |
| `GET` | `/api/stems/{job_id}/{filename}` | Download single stem |
| `GET` | `/api/stems/{job_id}/zip` | Download all stems as ZIP |
| `POST` | `/api/folder/watch` | Start folder watcher |
| `DELETE` | `/api/folder/watch` | Stop folder watcher |
| `GET` | `/api/folder/watch` | Watcher status |

---

## Testing Checklist

- [ ] Drag an MP3 into the drop zone → file name + size appear
- [ ] Drag a `.txt` → toast says "not supported"
- [ ] Select 4 stems / Demucs / WAV → click Start → progress bar animates
- [ ] On completion → stem cards with waveform players appear
- [ ] Click individual download → file saves
- [ ] Click "Download All as ZIP" → ZIP saves
- [ ] Open in Firefox → folder linker shows "Chromium required" message
- [ ] Backend at `/docs` → Swagger UI loads

---

## Known Limitations

- **In-memory job store** — jobs are lost on server restart. Swap for Redis/Postgres for persistence.
- **Single-file upload** — batch upload is a stretch goal.
- **No GPU auto-detection** — Demucs will use CPU unless CUDA/MPS is detected by PyTorch.
- **Folder watcher** uses the backend host's filesystem — won't work across Docker container boundaries without volume mounts.
- **No authentication** — add API keys or OAuth for production.

---

## License

MIT
