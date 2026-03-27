"""FastAPI backend for Ora web app."""

import base64
import io
import os
import tempfile

import soundfile as sf
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from demographics import generate_demographics_report
from llm import judge
from tts import speak
from stt import transcribe

class JudgeRequest(BaseModel):
    pitch_text: str
    include_tts_audio: bool = True


class DemographicsRequest(BaseModel):
    csv_url: str | None = None


app = FastAPI(title="Ora Web API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if os.path.isdir("outputs"):
    app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")


def _format_speech_text(result: dict) -> str:
    return (
        f"{result['roast']} Verdict: {result['verdict']}."
    )


def _to_web_paths(paths: list[str]) -> list[str]:
    web_paths = []
    for p in paths:
        normalized = p.replace("\\", "/")
        if normalized.startswith("outputs/"):
            web_paths.append("/" + normalized)
        else:
            web_paths.append(normalized)
    return web_paths


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "ora-web-backend"}


@app.post("/api/judge")
def judge_pitch(payload: JudgeRequest) -> dict:
    result = judge(payload.pitch_text)
    response = {"result": result}

    if payload.include_tts_audio:
        speech_text = _format_speech_text(result)
        audio_data, sample_rate = speak(speech_text)

        buffer = io.BytesIO()
        sf.write(buffer, audio_data, sample_rate, format="WAV")
        audio_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        response["speech_text"] = speech_text
        response["audio_mime"] = "audio/wav"
        response["audio_base64"] = audio_base64

    return response


@app.post("/api/demographics/generate")
def generate_demographics(payload: DemographicsRequest) -> dict:
    report = generate_demographics_report(csv_url=payload.csv_url)
    return report

@app.post("/api/demographics/upload")
async def upload_demographics(file: UploadFile = File(...)) -> dict:
    fd, temp_path = tempfile.mkstemp(suffix=".csv")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(await file.read())
        report = generate_demographics_report(csv_url=temp_path)
        return report
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)) -> dict:
    # Save the uploaded audio to a temporary file
    fd, temp_path = tempfile.mkstemp(suffix=".webm")  # Browsers often send webm
    try:
        with os.fdopen(fd, "wb") as f:
            content = await file.read()
            f.write(content)
        
        text = transcribe(temp_path)
        return {"text": text}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
