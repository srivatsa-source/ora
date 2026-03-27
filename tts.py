"""
Ora — Text-to-Speech
Uses Kokoro-ONNX to generate Ora's cold, clinical voice.
"""

import numpy as np
from kokoro_onnx import Kokoro
from config import KOKORO_VOICE, KOKORO_SPEED, KOKORO_SAMPLE_RATE


# Global TTS instance (loaded once)
_kokoro = None


def _get_kokoro() -> Kokoro:
    """Lazy-load the Kokoro TTS model. Downloads on first run."""
    global _kokoro
    if _kokoro is None:
        print("[ORA] Loading Kokoro TTS model...")
        _kokoro = Kokoro.from_pretrained()
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
