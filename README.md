# ORA — The Ultimate Tech Roast Show AI

> *Your Brutal AI Co-Host for the Next Viral Tech YouTube Channel*

Ora has pivoted from a hackathon judge to a full-time, unapologetic **Tech Roast AI** designed for a YouTube show format. It listens to developers explaining their tech stacks, showing off their code, or pitching their side projects, and brutally roasts them with surgical, clinical precision—all spoken in real-time over the studio speakers.

## What is Ora?

Ora is an interactive voice-driven AI co-host that:
- Listens to audio natively (live interviews / pitches)
- Analyzes the input using local LLMs (Ollama + Qwen2.5-Coder:3b)
- Generates a hilarious, brutally honest text roast
- Uses high-quality TTS to speak the roast out loud on stream

## Web App (React + FastAPI)

A full-stack web version is included for the studio control room:

- Frontend: React (Vite) in `web_ui/` with a pixel-console theme
- Backend: FastAPI in `web_backend/main.py`

Web features:

- Submit tech stack/pitch text and get an instant Ora roast, score, and verdict
- Stream generated TTS audio responses directly in the browser
- Generate demographic charts (if needed for analyzing your audience)

### Run Web Backend

```bash
pip install -r requirements.txt
uvicorn web_backend.main:app --reload --port 8000
```

### Run Web Frontend

```bash
cd web_ui
npm install
npm run dev
```

Then open the local Vite URL (typically `http://localhost:5173`).

### One-Command Start (Studio Mode)

From the project root, start the whole internal dashboard:

```powershell
./start_web.ps1
```

Or from Command Prompt:

```bat
start_web.bat
```

This spins up:

- FastAPI backend at `http://localhost:8000`
- React frontend at `http://localhost:5173`

Closing the frontend with `Ctrl+C` gracefully shuts down the backend.

## Architecture

```
🎤 Studio Mic → [Silero VAD] → [Faster-Whisper STT] → [Qwen2.5-Coder:3b + Roast Prompt] → [Kokoro TTS] → 🔊 Studio Speakers
```

## Prerequisites

- **Python 3.10+**
- **Ollama** installed and running on your local machine:
  ```bash
  ollama pull qwen2.5-coder:3b
  ollama serve
  ```
- **Studio Microphone** connected for the guests
- **Speakers** configured for Ora's devastating feedback

## Setup

```bash
# Install dependencies
pip install -r requirements.txt
```

> **Note:** On Windows, you may encounter issues installing PyAudio directly. Use this workaround:
> ```bash
> pip install pipwin
> pipwin install pyaudio
> ```

## Live Show Usage (CLI)

Run the main CLI interactive loop for the live show:

```bash
python ora.py
```

1. Ora attempts to generate pixel demographics charts from your Google Sheet (if configured)
2. Ora initializes all models (first run downloads Kokoro & Whisper weights)
3. Ora listens for speech via your microphone
4. When you stop talking (~1.5s silence), Ora processes your pitch
5. Verdict is printed to console and spoken aloud (with snarky comments)
6. Ora waits for the next pitch

Press `Ctrl+C` to terminate.

## Configuration

Edit `config.py` to adjust:

| Setting | Default | Description |
|---------|---------|-------------|
| `WHISPER_MODEL_SIZE` | `base.en` | STT model size (tiny/base/small/medium) |
| `OLLAMA_MODEL` | `llama3.1` | LLM model to use |
| `KOKORO_VOICE` | `af_sarah` | TTS voice |
| `KOKORO_SPEED` | `0.9` | Speech speed (lower = slower) |
| `VAD_THRESHOLD` | `0.5` | Speech detection sensitivity |
| `SILENCE_DURATION_S` | `1.5` | Silence before end-of-speech |
| `GOOGLE_SHEET_CSV_URL` | `""` | Published Google Sheet CSV URL for demographics |
| `DEMOGRAPHICS_OUTPUT_DIR` | `outputs/demographics` | Folder where pixel charts are saved |
| `DEMOGRAPHICS_TOP_N` | `10` | Maximum number of bars shown per chart |

### Google Sheets Demographics Setup

1. Publish your sheet as CSV and copy the URL:
  `https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=0`
2. Set `GOOGLE_SHEET_CSV_URL` in `config.py`.
3. Ensure your sheet has columns like `College` and `City` (auto-detected with aliases).

Generated charts:
- `outputs/demographics/participants_by_college.png`
- `outputs/demographics/participants_by_city.png`

## Project Structure

```
ora/
├── ora.py           # Main pipeline orchestrator
├── config.py        # Prompts, constants, model config
├── audio_io.py      # Microphone input & speaker output
├── vad.py           # Silero VAD speech detection
├── stt.py           # Faster-Whisper transcription
├── llm.py           # Ollama/Llama 3.1 Ora brain
├── tts.py           # Kokoro TTS voice synthesis
├── demographics.py  # Google Sheets demographics charts (pixel style)
├── web_backend/     # FastAPI backend for web app
├── web_ui/          # React frontend (pixel themed)
├── requirements.txt # Dependencies
└── README.md        # This file
```
