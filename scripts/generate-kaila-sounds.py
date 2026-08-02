#!/usr/bin/env python3
"""Generate original KAILA notification and ringtone assets.

Sounds are procedurally synthesized (sine / soft harmonics + ADSR).
No third-party samples or copyrighted melodies are used.

Outputs:
  apps/web/public/sounds/*.wav
  apps/mobile/android/app/src/main/res/raw/*.wav
"""

from __future__ import annotations

import math
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB_OUT = ROOT / "apps/web/public/sounds"
ANDROID_OUT = ROOT / "apps/mobile/android/app/src/main/res/raw"
SAMPLE_RATE = 44100

# Warm KAILA palette: soft major-pentatonic-ish tones around A4–E5.
A4 = 440.00
B4 = 493.88
C5 = 523.25
D5 = 587.33
E5 = 659.25
F5 = 698.46
G5 = 783.99
A5 = 880.00


def envelope(n: int, attack: float = 0.04, release: float = 0.25) -> list[float]:
    env = [1.0] * n
    a = max(1, int(n * attack))
    r = max(1, int(n * release))
    for i in range(a):
        env[i] = i / a
    for i in range(r):
        env[n - 1 - i] = i / r
    return env


def tone(freq: float, duration: float, amplitude: float = 0.28, attack: float = 0.05, release: float = 0.3) -> list[float]:
    n = int(SAMPLE_RATE * duration)
    env = envelope(n, attack=attack, release=release)
    samples: list[float] = []
    for i in range(n):
        t = i / SAMPLE_RATE
        # Soft triangle-ish harmonic stack for a brandable, non-buzzy chime.
        wave_val = (
            math.sin(2 * math.pi * freq * t)
            + 0.28 * math.sin(2 * math.pi * freq * 2 * t)
            + 0.08 * math.sin(2 * math.pi * freq * 3 * t)
        )
        samples.append(amplitude * wave_val * env[i])
    return samples


def silence(duration: float) -> list[float]:
    return [0.0] * int(SAMPLE_RATE * duration)


def mix(*tracks: list[float]) -> list[float]:
    length = max((len(track) for track in tracks), default=0)
    out = [0.0] * length
    for track in tracks:
        for i, sample in enumerate(track):
            out[i] += sample
    peak = max((abs(sample) for sample in out), default=1.0)
    if peak > 0.95:
        scale = 0.95 / peak
        out = [sample * scale for sample in out]
    return out


def concat(*parts: list[float]) -> list[float]:
    out: list[float] = []
    for part in parts:
        out.extend(part)
    return out


def write_wav(path: Path, samples: list[float]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    frames = b"".join(struct.pack("<h", max(-32767, min(32767, int(sample * 32767)))) for sample in samples)
    with wave.open(str(path), "w") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(SAMPLE_RATE)
        handle.writeframes(frames)


def job_match() -> list[float]:
    """Bright ascending pair — new nearby opportunity."""
    return concat(tone(D5, 0.14, 0.26, attack=0.03, release=0.35), silence(0.04), tone(A5, 0.22, 0.24, attack=0.02, release=0.45))


def job_hired() -> list[float]:
    """Warm three-note rise — you were hired / offer accepted."""
    return concat(
        tone(C5, 0.12, 0.24, attack=0.04, release=0.3),
        silence(0.03),
        tone(E5, 0.12, 0.24, attack=0.04, release=0.3),
        silence(0.03),
        tone(G5, 0.28, 0.26, attack=0.03, release=0.45),
    )


def message() -> list[float]:
    """Soft double blip — chat message received."""
    return concat(tone(B4, 0.08, 0.2, attack=0.02, release=0.4), silence(0.05), tone(E5, 0.1, 0.18, attack=0.02, release=0.45))


def message_sent() -> list[float]:
    """Soft rising confirmation — your message left."""
    return concat(
        tone(C5, 0.055, 0.14, attack=0.01, release=0.4),
        silence(0.02),
        tone(G5, 0.09, 0.16, attack=0.015, release=0.45),
    )


def offer() -> list[float]:
    """Friendly two-tone bounce — first offer on a job."""
    return concat(tone(E5, 0.11, 0.22, attack=0.03, release=0.35), silence(0.035), tone(C5, 0.16, 0.2, attack=0.03, release=0.4))


def counter_offer() -> list[float]:
    """Slightly quicker three-step bounce — counteroffer / revised terms."""
    return concat(
        tone(G5, 0.08, 0.2, attack=0.02, release=0.3),
        silence(0.03),
        tone(E5, 0.08, 0.2, attack=0.02, release=0.3),
        silence(0.03),
        tone(C5, 0.14, 0.22, attack=0.02, release=0.4),
    )


def typing() -> list[float]:
    """Very soft short tick — peer started typing."""
    return tone(B4, 0.05, 0.1, attack=0.01, release=0.55)


def react() -> list[float]:
    """Tiny bright pop — message reaction added."""
    return concat(tone(A5, 0.045, 0.16, attack=0.01, release=0.35), silence(0.02), tone(E5, 0.06, 0.12, attack=0.01, release=0.45))


def job_update() -> list[float]:
    """Subtle mid ping — status / completion / general job update."""
    return tone(D5, 0.18, 0.2, attack=0.05, release=0.5)


def travel() -> list[float]:
    """Airy arriving chime — travel / arrival."""
    return concat(tone(G5, 0.1, 0.18, attack=0.02, release=0.35), silence(0.04), tone(E5, 0.12, 0.16, attack=0.02, release=0.4), silence(0.04), tone(C5, 0.2, 0.18, attack=0.03, release=0.5))


def support() -> list[float]:
    """Soft attention tone — support / dispute."""
    return concat(tone(A4, 0.14, 0.2, attack=0.05, release=0.35), silence(0.06), tone(A4, 0.18, 0.18, attack=0.05, release=0.45))


def call_ring() -> list[float]:
    """Original looping-friendly ringtone (~3.2s) — not a phone default clone."""
    motif = concat(
        tone(E5, 0.18, 0.24, attack=0.03, release=0.25),
        silence(0.04),
        tone(G5, 0.18, 0.22, attack=0.03, release=0.25),
        silence(0.04),
        tone(A5, 0.28, 0.24, attack=0.03, release=0.35),
        silence(0.12),
        tone(G5, 0.16, 0.2, attack=0.03, release=0.3),
        silence(0.04),
        tone(E5, 0.22, 0.22, attack=0.03, release=0.4),
        silence(0.28),
    )
    return concat(motif, motif)


def call_ringback() -> list[float]:
    """Outgoing wait tone — dual pulse + pause, loopable (~2.1s)."""
    return concat(
        tone(D5, 0.32, 0.16, attack=0.04, release=0.25),
        silence(0.14),
        tone(D5, 0.32, 0.16, attack=0.04, release=0.25),
        silence(1.3),
    )


def call_answered() -> list[float]:
    """Two ascending confirmation tones — call connected."""
    return concat(
        tone(E5, 0.09, 0.2, attack=0.02, release=0.3),
        silence(0.035),
        tone(A5, 0.16, 0.22, attack=0.02, release=0.45),
    )


def call_ended() -> list[float]:
    """Descending soft close — call hung up or declined."""
    return concat(
        tone(E5, 0.1, 0.18, attack=0.03, release=0.35),
        silence(0.04),
        tone(C5, 0.16, 0.16, attack=0.03, release=0.5),
    )


def call_failed() -> list[float]:
    """Low double attention tone — call failed to connect."""
    return concat(
        tone(A4, 0.12, 0.22, attack=0.03, release=0.3),
        silence(0.08),
        tone(A4, 0.18, 0.2, attack=0.03, release=0.45),
    )


SOUNDS = {
    "kaila_job_match": job_match,
    "kaila_job_hired": job_hired,
    "kaila_message": message,
    "kaila_message_sent": message_sent,
    "kaila_offer": offer,
    "kaila_counter_offer": counter_offer,
    "kaila_typing": typing,
    "kaila_react": react,
    "kaila_job_update": job_update,
    "kaila_travel": travel,
    "kaila_support": support,
    "kaila_call_ring": call_ring,
    "kaila_call_ringback": call_ringback,
    "kaila_call_answered": call_answered,
    "kaila_call_ended": call_ended,
    "kaila_call_failed": call_failed,
}


def main() -> None:
    WEB_OUT.mkdir(parents=True, exist_ok=True)
    ANDROID_OUT.mkdir(parents=True, exist_ok=True)
    catalog: list[str] = []
    for name, builder in SOUNDS.items():
        samples = builder()
        write_wav(WEB_OUT / f"{name}.wav", samples)
        write_wav(ANDROID_OUT / f"{name}.wav", samples)
        duration = len(samples) / SAMPLE_RATE
        catalog.append(f"| `{name}.wav` | {duration:.2f}s |")
        print(f"wrote {name}.wav ({duration:.2f}s)")

    readme = WEB_OUT / "README.md"
    readme.write_text(
        "\n".join(
            [
                "# KAILA original notification sounds",
                "",
                "Procedurally generated with `scripts/generate-kaila-sounds.py`.",
                "No third-party samples. Regenerate with:",
                "",
                "```sh",
                "python3 scripts/generate-kaila-sounds.py",
                "```",
                "",
                "| File | Duration |",
                "| --- | --- |",
                *catalog,
                "",
                "Android copies live in `apps/mobile/android/app/src/main/res/raw/`.",
                "",
            ]
        )
    )
    print(f"catalog -> {readme}")


if __name__ == "__main__":
    main()
