"""
Ora — Text-to-Speech
Uses Kokoro-ONNX to generate Ora's cold, clinical voice.
"""

import os
import requests
from tqdm import tqdm
import numpy as np
from kokoro_onnx import Kokoro
from config import KOKORO_VOICE, KOKORO_SPEED, KOKORO_SAMPLE_RATE


# Global TTS instance (loaded once)
_kokoro = None

def _download_file(url: str, filename: str):
    print(f"[ORA] Downloading {filename}...")
    response = requests.get(url, stream=True)
    response.raise_for_status()
    total_size = int(response.headers.get('content-length', 0))
    with open(filename, 'wb') as f, tqdm(
        desc=filename,
        total=total_size,
        unit='iB',
        unit_scale=True,
        unit_divisor=1024,
    ) as bar:
        for data in response.iter_content(chunk_size=1024):
            size = f.write(data)
            bar.update(size)


def _get_kokoro() -> Kokoro:
    """Lazy-load the Kokoro TTS model. Downloads on first run."""
    global _kokoro
    if _kokoro is None:
        model_file = "kokoro-v1.0.onnx"
        voices_file = "voices-v1.0.bin"
        
        if not os.path.exists(model_file):
            _download_file(
                "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx",
                model_file
            )
        if not os.path.exists(voices_file):
            _download_file(
                "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin",
                voices_file
            )

        print("[ORA] Loading Kokoro TTS model...")
        _kokoro = Kokoro(model_file, voices_file)
        print("[ORA] Kokoro TTS model loaded.")
    return _kokoro


def speak(text: str) -> tuple[np.ndarray, int]:
    """
    Convert text to speech audio.
    Returns (audio_data, sample_rate) where audio_data is a float32 numpy array.
    """
    kokoro = _get_kokoro()

    audio, sample_rate = kokoro.create(
        text,
        voice=KOKORO_VOICE,
        speed=KOKORO_SPEED,
    )

    return audio, sample_rate
