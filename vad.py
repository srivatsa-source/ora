"""
Ora — Voice Activity Detection
Uses Silero VAD to detect when a speaker starts and stops talking.
"""

import torch
import numpy as np
from config import SAMPLE_RATE, VAD_THRESHOLD, MIN_SPEECH_DURATION_S, SILENCE_DURATION_S, CHUNK_DURATION_MS


class SpeechDetector:
    """
    Detects speech boundaries using Silero VAD.
    Feed audio chunks via feed() and check the returned state.
    """

    # States
    SILENCE = "SILENCE"
    SPEAKING = "SPEAKING"
    DONE = "DONE"

    def __init__(self):
        # Load Silero VAD
        self.model, self.utils = torch.hub.load(
            repo_or_dir="snakers4/silero-vad",
            model="silero_vad",
            trust_repo=True,
        )
        self.reset()

    def reset(self):
        """Reset detector state for a new pitch."""
        self.model.reset_states()
        self.state = self.SILENCE
        self.audio_buffer = []
        self.speech_chunks = 0
        self.silence_chunks = 0
        self.chunks_per_second = 1000 / CHUNK_DURATION_MS
        self.min_speech_chunks = int(MIN_SPEECH_DURATION_S * self.chunks_per_second)
        self.silence_limit_chunks = int(SILENCE_DURATION_S * self.chunks_per_second)

    def feed(self, chunk: np.ndarray) -> str:
        """
        Feed a single audio chunk (float32 numpy array).
        Returns current state: SILENCE, SPEAKING, or DONE.
        """
        # Convert to torch tensor
        tensor = torch.from_numpy(chunk).float()

        # Get speech probability
        speech_prob = self.model(tensor, SAMPLE_RATE).item()

        is_speech = speech_prob >= VAD_THRESHOLD

        if self.state == self.SILENCE:
            if is_speech:
                self.state = self.SPEAKING
                self.audio_buffer.append(chunk)
                self.speech_chunks = 1
                self.silence_chunks = 0
            # In silence, don't buffer audio

        elif self.state == self.SPEAKING:
            self.audio_buffer.append(chunk)

            if is_speech:
                self.speech_chunks += 1
                self.silence_chunks = 0
            else:
                self.silence_chunks += 1

                # If silence exceeds the limit and we heard enough speech, mark done
                if (self.silence_chunks >= self.silence_limit_chunks
                        and self.speech_chunks >= self.min_speech_chunks):
                    self.state = self.DONE

        return self.state

    def get_audio(self) -> np.ndarray:
        """
        Returns the complete audio buffer as a single numpy array.
        Call this after state becomes DONE.
        """
        if not self.audio_buffer:
            return np.array([], dtype=np.float32)
        return np.concatenate(self.audio_buffer)
