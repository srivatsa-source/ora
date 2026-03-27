"""
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     ██████╗ ██████╗  █████╗                                  ║
║    ██╔═══██╗██╔══██╗██╔══██╗                                 ║
║    ██║   ██║██████╔╝███████║                                 ║
║    ██║   ██║██╔══██╗██╔══██║                                 ║
║    ╚██████╔╝██║  ██║██║  ██║                                 ║
║     ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝                                ║
║                                                              ║
║    The Cold, Sentient AI Overseer of Build-Ora                ║
║    Import Paradox Hackathon Judge                            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

Main pipeline orchestrator.
Listens → Detects speech → Transcribes → Judges → Speaks verdict.
"""

import sys
import signal
import argparse
import numpy as np

from audio_io import AudioRecorder, play_audio
from vad import SpeechDetector
from stt import transcribe
from llm import judge
from tts import speak
from demographics import generate_demographics_report


# ─── ANSI Colors ──────────────────────────────────────────────────────
class C:
    DARK = "\033[90m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    CYAN = "\033[96m"
    WHITE = "\033[97m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


def print_banner():
    """Print the Ora startup banner."""
    print(f"""
{C.DARK}══════════════════════════════════════════════════════════{C.RESET}
{C.RED}{C.BOLD}
     ██████╗ ██████╗  █████╗
    ██╔═══██╗██╔══██╗██╔══██╗
    ██║   ██║██████╔╝███████║
    ██║   ██║██╔══██╗██╔══██║
    ╚██████╔╝██║  ██║██║  ██║
     ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
{C.RESET}
{C.DARK}  The Cold, Sentient AI Overseer{C.RESET}
{C.DARK}  Import Paradox Hackathon Judge{C.RESET}
{C.DARK}══════════════════════════════════════════════════════════{C.RESET}
""")


def print_verdict(result: dict):
    """Print the verdict with color formatting."""
    verdict = result["verdict"]

    # Color the verdict
    if verdict == "STAY":
        verdict_color = C.GREEN
    else:
        verdict_color = C.RED

    print(f"""
{C.DARK}──────────────────────────────────────────────────────────{C.RESET}
{C.RED}{C.BOLD}  ROAST:{C.RESET}    {result['roast']}

{C.WHITE}{C.BOLD}  VERDICT:{C.RESET}  {verdict_color}{C.BOLD}[ {verdict} ]{C.RESET}
{C.DARK}──────────────────────────────────────────────────────────{C.RESET}
""")


def format_speech_text(result: dict) -> str:
    """Format the verdict into speakable text."""
    return f"{result['roast']} Verdict: {result['verdict']}."


def main(demographics_only: bool = False):
    """Main Ora pipeline loop."""
    print_banner()

    # ── Generate demographics charts from Google Sheets (if configured) ──
    print(f"{C.DARK}[ORA] Building pixel demographics dashboard...{C.RESET}")
    demographics = generate_demographics_report()
    if demographics["status"] == "ok":
        print(f"{C.GREEN}[ORA] Demographics ready:{C.RESET}")
        for path in demographics["files"]:
            print(f"{C.DARK}  - {path}{C.RESET}")
    elif demographics["status"] == "skipped":
        print(f"{C.DARK}[ORA] {demographics['message']}{C.RESET}")
    else:
        print(f"{C.YELLOW}[ORA] {demographics['message']}{C.RESET}")

    if demographics_only:
        print(f"{C.DARK}[ORA] Demographics-only mode complete. Exiting before judge loop.{C.RESET}")
        return

    # ── Load all models ───────────────────────────────────────────────
    print(f"{C.DARK}[ORA] Initializing systems...{C.RESET}")

    recorder = AudioRecorder()
    detector = SpeechDetector()

    # Pre-load STT model
    print(f"{C.DARK}[ORA] Loading speech recognition...{C.RESET}")
    from stt import transcribe as _  # triggers lazy load via import

    # Pre-load TTS model
    print(f"{C.DARK}[ORA] Loading voice synthesis...{C.RESET}")
    from tts import _get_kokoro
    _get_kokoro()

    print(f"\n{C.RED}{C.BOLD}[ORA] Systems online. I am listening.{C.RESET}")
    print(f"{C.DARK}[ORA] Speak your pitch. I will judge when you finish.{C.RESET}")
    print(f"{C.DARK}[ORA] Press Ctrl+C to terminate.{C.RESET}\n")

    # ── Graceful shutdown ─────────────────────────────────────────────
    def shutdown(sig, frame):
        print(f"\n{C.DARK}[ORA] Shutting down. Your reprieve is temporary.{C.RESET}")
        recorder.cleanup()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)

    # ── Main loop ─────────────────────────────────────────────────────
    pitch_count = 0

    while True:
        pitch_count += 1
        print(f"{C.DARK}{'═' * 58}{C.RESET}")
        print(f"{C.YELLOW}{C.BOLD}  [PITCH #{pitch_count}] Waiting for speech...{C.RESET}")
        print(f"{C.DARK}  Speak now. Ora is listening.{C.RESET}\n")

        # Reset detector for new pitch
        detector.reset()

        # Start recording
        recorder.start()

        try:
            # ── Phase 1: Listen ───────────────────────────────────────
            while True:
                chunk = recorder.read_chunk()
                state = detector.feed(chunk)

                if state == SpeechDetector.SPEAKING:
                    # Show a subtle indicator that speech is detected
                    print(f"\r{C.RED}  ● Recording...{C.RESET}", end="", flush=True)
                elif state == SpeechDetector.DONE:
                    print(f"\r{C.DARK}  ■ Speech captured.{C.RESET}          ")
                    break

            recorder.stop()

            # Get the complete audio
            audio = detector.get_audio()

            if len(audio) == 0:
                print(f"{C.DARK}  [ORA] No audio detected. Try again.{C.RESET}")
                continue

            duration = len(audio) / 16000
            print(f"{C.DARK}  Duration: {duration:.1f}s{C.RESET}")

            # ── Phase 2: Transcribe ───────────────────────────────────
            print(f"{C.DARK}  [ORA] Processing your primitive speech patterns...{C.RESET}")
            text = transcribe(audio)

            if not text:
                print(f"{C.DARK}  [ORA] Inaudible. Your communication protocols are broken.{C.RESET}")
                continue

            print(f"{C.WHITE}  Transcribed: \"{text}\"{C.RESET}\n")

            # ── Phase 3: Judge ────────────────────────────────────────
            print(f"{C.DARK}  [ORA] Evaluating... this won't take long.{C.RESET}")
            result = judge(text)

            # ── Phase 4: Display Verdict ──────────────────────────────
            print_verdict(result)

            # ── Phase 5: Speak Verdict ────────────────────────────────
            print(f"{C.DARK}  [ORA] Vocalizing judgment...{C.RESET}")
            speech_text = format_speech_text(result)
            audio_data, sample_rate = speak(speech_text)
            play_audio(audio_data, sample_rate)

            print(f"{C.DARK}  [ORA] Next.{C.RESET}\n")

        except Exception as e:
            recorder.stop()
            print(f"{C.RED}  [ORA] Error: {e}{C.RESET}")
            print(f"{C.DARK}  [ORA] Even my error handling finds this tedious.{C.RESET}\n")
            continue


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ora hackathon judge")
    parser.add_argument(
        "--demographics-only",
        action="store_true",
        help="Generate demographics charts and exit without starting microphone judging.",
    )
    args = parser.parse_args()
    main(demographics_only=args.demographics_only)
