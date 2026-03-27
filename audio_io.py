"""
Ora — Audio I/O
Handles microphone input via PyAudio and speaker output via sounddevice.
"""

import pyaudio
import numpy as np
import sounddevice as sd
from config import SAMPLE_RATE, CHANNELS, CHUNK_SIZE


class AudioRecorder:
    """Records audio from the default microphone in chunks."""

    def __init__(self):
        self.pa = pyaudio.PyAudio()
        self.stream = None

    def start(self):
        """Open the microphone stream."""
        self.stream = self.pa.open(
            format=pyaudio.paInt16,
            channels=CHANNELS,
            rate=SAMPLE_RATE,
            input=True,
            frames_per_buffer=CHUNK_SIZE,
        )

    def read_chunk(self):
        """
        Read a single chunk of audio from the mic.
        Returns a numpy float32 array normalized to [-1, 1].
        """
        raw = self.stream.read(CHUNK_SIZE, exception_on_overflow=False)
        audio_int16 = np.frombuffer(raw, dtype=np.int16)
        audio_float32 = audio_int16.astype(np.float32) / 32768.0
        return audio_float32

    def stop(self):
        """Close the microphone stream."""
        if self.stream is not None:
            self.stream.stop_stream()
            self.stream.close()
            self.stream = None

    def cleanup(self):
        """Terminate PyAudio."""
        self.stop()
        self.pa.terminate()


def play_audio(audio_data: np.ndarray, sample_rate: int):
    """
    Play audio through the default speakers.
    audio_data: numpy float32 array
    sample_rate: sample rate of the audio
    """
    sd.play(audio_data, samplerate=sample_rate)
    sd.wait()  # Block until playback is finished
