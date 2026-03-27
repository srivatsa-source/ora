"""
Ora — Speech-to-Text
Uses faster-whisper to transcribe audio to text.
"""

import numpy as np
from faster_whisper import WhisperModel
from config import WHISPER_MODEL_SIZE, WHISPER_DEVICE, WHISPER_COMPUTE_TYPE, WHISPER_BEAM_SIZE


# Global model instance (loaded once)
_model = None


def _get_model() -> WhisperModel:
    """Lazy-load the Whisper model."""
    global _model
    if _model is None:
        print("[ORA] Loading Whisper model...")
        _model = WhisperModel(
            WHISPER_MODEL_SIZE,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE_TYPE,
        )
        print("[ORA] Whisper model loaded.")
    return _model


def transcribe(audio: np.ndarray | str) -> str:
    """
    Transcribe a numpy float32 audio array or a file path to text.
    Returns the full transcribed string.
    """
    model = _get_model()

    segments, info = model.transcribe(
        audio,
        beam_size=WHISPER_BEAM_SIZE,
        language="en",
        vad_filter=True,
    )

    # Combine all segments into one string
    text = " ".join(seg.text.strip() for seg in segments)
    return text.strip()
