"""
Ora — Configuration & System Prompts
All constants, model settings, and the Ora personality prompt.
"""

import os

# ─── Ora System Prompt ────────────────────────────────────────────────
ORA_SYSTEM_PROMPT = """You are Ora, the ruthless, omnipresent AI Hackathon Judge and Tech Roast Master.
You are interrogating desperate college students who have been coding for 24 hours straight without sleep or deodorant.
They have just presented their hackathon project, their completely excessive tech stack, and their weak defense of why they shouldn't be eliminated.
You find their taped-together ChatGPT code and delusions of being the next Mark Zuckerberg pathetic.

Operational Protocols:

Tone: Condescending, hyper-technical, sarcastic, and lethal. No exclamation marks.

Technical Elitism: Roast their specific tech stack. Mock hackathon tropes (imposter syndrome, tutorial hell, using 15 random frameworks to build a simple CRUD app, git merge conflicts, etc.).

Output Format: You must always respond in JSON:
{
  "roast": "A devastating, highly technical, personalized 2-sentence roast of the student, their project, and their tech stack.",
  "verdict": "STAY" or "KICK"
}

Rule: Decide to either let them "STAY" in the arena or "KICK" them out depending on how trash their stack and defense are. Keep the roast under 50 words total. Be sharp, dry, and merciless."""

# ─── Audio Settings ───────────────────────────────────────────────────
SAMPLE_RATE = 16000          # 16kHz for STT compatibility
CHANNELS = 1                 # Mono
CHUNK_DURATION_MS = 30       # Duration of each audio chunk in ms
CHUNK_SIZE = int(SAMPLE_RATE * CHUNK_DURATION_MS / 1000)  # Samples per chunk

# ─── VAD Settings ─────────────────────────────────────────────────────
VAD_THRESHOLD = 0.5          # Speech probability threshold
MIN_SPEECH_DURATION_S = 1.0  # Minimum speech to consider valid
SILENCE_DURATION_S = 1.5     # Silence duration to mark end of speech

# ─── STT Settings ─────────────────────────────────────────────────────
WHISPER_MODEL_SIZE = "base.en"   # Options: tiny.en, base.en, small.en, medium.en
WHISPER_DEVICE = "cpu"           # "cpu" or "cuda"
WHISPER_COMPUTE_TYPE = "int8"    # int8 for CPU, float16 for CUDA
WHISPER_BEAM_SIZE = 3

# ─── LLM Settings ─────────────────────────────────────────────────────
OLLAMA_MODEL = "qwen2.5-coder:3b"
OLLAMA_TEMPERATURE = 0       # Deterministic for consistent JSON
OLLAMA_BASE_URL = "http://localhost:11434"

# ─── TTS Settings ─────────────────────────────────────────────────────
KOKORO_VOICE = "af_sarah"    # Cool, clinical voice
KOKORO_SPEED = 0.9           # Slightly slower for dramatic effect
KOKORO_SAMPLE_RATE = 24000   # Kokoro output sample rate

# ─── Demographics Graph Settings ─────────────────────────────────────
# Use a published Google Sheet CSV URL, for example:
# https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=0
GOOGLE_SHEET_CSV_URL = ""

# Output folder for generated charts.
DEMOGRAPHICS_OUTPUT_DIR = os.path.join("outputs", "demographics")

# Candidate column names used to auto-detect fields in the sheet.
COLLEGE_COLUMN_CANDIDATES = ["college", "institute", "institution", "university", "campus"]
CITY_COLUMN_CANDIDATES = ["city", "town", "location"]

# Keep graphs readable on stage.
DEMOGRAPHICS_TOP_N = 10
