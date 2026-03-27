"""
Ora — LLM Brain
Uses Ollama with Llama 3.1 to generate Ora's cold, elitist judgments.
"""

import json
import random
import ollama
from config import ORA_SYSTEM_PROMPT, OLLAMA_MODEL, OLLAMA_TEMPERATURE


SNARKY_KICK_LINES = [
    "Git push yourself to the audience.",
    "Your roadmap belongs in /dev/null.",
    "This pitch has the uptime of a crash loop.",
    "I detected ambition. No execution.",
    "Your architecture is all latency, zero signal.",
]

SNARKY_STAY_LINES = [
    "You may stay. Temporarily.",
    "Proceed. My disappointment is deferred.",
    "You survive this iteration.",
]


def _normalize_result(result: dict) -> dict:
    """Clamp score, normalize verdict, and append a snarky one-liner."""
    verdict = str(result.get("verdict", "KICK")).upper().strip()
    if verdict not in {"STAY", "KICK"}:
        verdict = "KICK"

    roast = result.get("roast", "You are not worth the compute cycles.")
    snark = random.choice(SNARKY_KICK_LINES if verdict == "KICK" else SNARKY_STAY_LINES)

    return {
        "roast": f"{roast} {snark}".strip(),
        "verdict": verdict,
    }


def judge(pitch_text: str) -> dict:
    """
    Send a transcribed pitch to Ora for judgment.
    Returns a dict with keys: roast, verdict.
    """
    user_message = f"Roast this human's answer:\n\n\"{pitch_text}\""

    try:
        response = ollama.chat(
            model=OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": ORA_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            format="json",
            options={
                "temperature": OLLAMA_TEMPERATURE,
            },
        )

        raw_text = response["message"]["content"]
        result = json.loads(raw_text)

        return _normalize_result(result)

    except json.JSONDecodeError:
        # LLM returned non-JSON — return a fallback
        return {
            "roast": "You managed to break a language model. Impressive failure.",
            "verdict": "KICK",
        }
    except Exception as e:
        return {
            "roast": "Even my error handler finds you tedious.",
            "verdict": "KICK",
        }
