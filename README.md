# ORA — The Cold, Sentient AI Overseer

> *Import Paradox Hackathon Judge*

Ora is a real-time voice AI that listens to hackathon pitches, judges them with cold, clinical precision, and speaks the verdict over stage speakers.

It can also generate a pixel-style demographics dashboard from Google Sheets data (participants by college/city) before judging starts.

## Web App (React + FastAPI)

A full-stack web version is included:

- Frontend: React (Vite) in `web_ui/` with a pixel-console theme
- Backend: FastAPI in `web_backend/main.py`

Web features:

- Submit pitch text and get Ora verdict (analysis, roast, score, STAY/KICK)
- Get generated TTS audio response in the browser
- Generate and preview demographics charts from Google Sheets CSV

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

### One-Command Start (Backend + Frontend)

From the project root, run:

```powershell
./start_web.ps1
```

Or from Command Prompt:

```bat
start_web.bat
```

This starts:

- FastAPI backend at `http://localhost:8000`
- React frontend at `http://localhost:5173`

When you stop the frontend process (`Ctrl+C`), the backend process is stopped automatically.

## Architecture

```
🎤 Mic → [Silero VAD] → [Faster-Whisper STT] → [Llama 3.1 + Ora Prompt] → [Kokoro TTS] → 🔊 Speakers
```

## Prerequisites

- **Python 3.10+**
- **Ollama** installed and running with Llama 3.1:
  ```
  ollama pull llama3.1
  ollama serve
  ```
- **Microphone** connected
- **Speakers** configured

## Setup

```bash
# Install dependencies
pip install -r requirements.txt
```

> **Note:** On Windows, you may need to install PyAudio via:
> ```bash
> pip install pipwin
> pipwin install pyaudio
> ```

## Usage

```bash
python ora.py
```

Generate demographics charts only (no microphone/judging loop):

```bash
python ora.py --demographics-only
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
