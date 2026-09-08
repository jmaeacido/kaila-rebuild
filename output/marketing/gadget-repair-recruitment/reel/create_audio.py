"""Generate clear Bisaya narration + upbeat original bed for the gadget-repair reel.

VO is kept near natural speed and placed with gaps so lines never overlap.
Scene holds are rebuilt to match measured speech length.
"""

from __future__ import annotations

import array
import asyncio
import json
import math
import subprocess
import wave
from pathlib import Path

import edge_tts

OUT = Path(__file__).resolve().parent
VOICE = "fil-PH-BlessicaNeural"
GAP = 0.45
LEAD_IN = 0.35
TAIL_HOLD = 1.2
FADE = 0.25

# Spoken copy for TTS.
# "QR" -> "kyu ar code" so Blessica does not mangle it.
# Questions are ONE full sentence (no spliced repair/nimo tails — those sound detached).
LINES = [
    {
        "kind": "line",
        "text": "Hoy! Isa ka ba ka-owner o technician sa cellphone ug gadget repair?",
        "label": "Hoy! ... gadget repair?",
    },
    {
        "kind": "line",
        "text": "O modawat ka ba og home service, pero pipila ra ang nakaila nimo?",
        "label": "... nakaila nimo?",
    },
    {
        "kind": "line",
        "text": "Ayos! Pwede ka diri sa KAILA! Mas makita ang imong skills ug serbisyo!",
        "label": "Ayos! Pwede ka diri sa KAILA! ...",
    },
    {
        "kind": "line",
        "text": "Apil isip Service Provider! E-scan ang kyu ar code. Pakita sa KAILA!",
        "label": "Apil isip Service Provider! E-scan ang QR code...",
    },
]

LINE_PROSODY = [
    {"rate": "+2%", "pitch": "+6Hz", "volume": "+6%"},
    {"rate": "+2%", "pitch": "+6Hz", "volume": "+6%"},
    {"rate": "+5%", "pitch": "+10Hz", "volume": "+8%"},
    {"rate": "+4%", "pitch": "+8Hz", "volume": "+8%"},
]


def run(args: list[str]) -> None:
    subprocess.run(args, check=True)


def probe_duration(path: Path) -> float:
    raw = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            str(path),
        ]
    )
    return float(json.loads(raw)["format"]["duration"])


async def _speak(text: str, path: Path, *, rate: str, pitch: str, volume: str) -> float:
    await edge_tts.Communicate(
        text,
        VOICE,
        rate=rate,
        pitch=pitch,
        volume=volume,
    ).save(str(path))
    return probe_duration(path)


def _to_wav48(src: Path, dst: Path) -> None:
    run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            "-i",
            str(src),
            "-ar",
            "48000",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            str(dst),
        ]
    )


def _read_wav_mono16(path: Path) -> tuple[int, array.array]:
    with wave.open(str(path), "rb") as wf:
        assert wf.getnchannels() == 1
        assert wf.getsampwidth() == 2
        rate = wf.getframerate()
        data = array.array("h")
        data.frombytes(wf.readframes(wf.getnframes()))
    return rate, data


def _write_wav_mono16(path: Path, rate: int, data: array.array) -> None:
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        wf.writeframes(data.tobytes())


def _silence(rate: int, seconds: float) -> array.array:
    return array.array("h", [0]) * max(0, int(rate * seconds))


def _peak_normalize(samples: array.array, target: int = 22000, max_gain: float = 2.5) -> array.array:
    peak = max((abs(s) for s in samples), default=1) or 1
    gain = min(target / peak, max_gain)
    out = array.array("h")
    for s in samples:
        out.append(int(max(-32767, min(32767, s * gain))))
    return out


def _concat_question(parts: list[Path], out_mp3: Path) -> float:
    """Join body + call-out in PCM (no ffmpeg afade — that was muting lines)."""
    rate = 48000
    pcm = array.array("h")
    for i, part in enumerate(parts):
        wav = OUT / f"_qpart-{out_mp3.stem}-{i}.wav"
        _to_wav48(part, wav)
        part_rate, samples = _read_wav_mono16(wav)
        if part_rate != rate:
            raise RuntimeError(f"unexpected rate {part_rate}")
        pcm.extend(_peak_normalize(samples))
        if i == 0:
            pcm.extend(_silence(rate, 0.05))
    mixed = OUT / f"_qmix-{out_mp3.stem}.wav"
    _write_wav_mono16(mixed, rate, pcm)
    run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            "-i",
            str(mixed),
            "-codec:a",
            "libmp3lame",
            "-q:a",
            "2",
            str(out_mp3),
        ]
    )
    return probe_duration(out_mp3)


async def generate_voice_files() -> list[float]:
    durations: list[float] = []
    for i, item in enumerate(LINES):
        target = OUT / f"voice-{i}.mp3"
        prosody = LINE_PROSODY[i]
        dur = await _speak(item["text"], target, **prosody)
        wav = OUT / f"voice-{i}.wav"
        _to_wav48(target, wav)
        rate, samples = _read_wav_mono16(wav)
        _write_wav_mono16(wav, rate, _peak_normalize(samples))
        durations.append(dur)
        safe = item["label"].encode("ascii", "replace").decode("ascii")
        print(f"VO {i + 1}: {dur:.2f}s - {safe[:56]}", flush=True)
    return durations


def place_segments(vo_durs: list[float]) -> tuple[list[tuple[float, float]], float, list[float]]:
    starts: list[float] = []
    t = LEAD_IN
    for dur in vo_durs:
        starts.append(t)
        t += dur + GAP
    total = t - GAP + TAIL_HOLD

    scene_durs: list[float] = []
    for i, dur in enumerate(vo_durs):
        pad = 0.55 if i < len(vo_durs) - 1 else TAIL_HOLD + 0.35
        scene_durs.append(dur + pad)

    n = len(scene_durs)
    video_total = sum(scene_durs) - FADE * (n - 1)
    if video_total < total:
        scene_durs[-1] += total - video_total

    return list(zip(starts, vo_durs, strict=True)), max(total, video_total), scene_durs


def build_voice_track(placements: list[tuple[float, float]], total: float) -> Path:
    """Single continuous VO timeline — avoids adelay/amix dropouts."""
    rate = 48000
    track = _silence(rate, total)
    for i, (start, _dur) in enumerate(placements):
        _rate, samples = _read_wav_mono16(OUT / f"voice-{i}.wav")
        if _rate != rate:
            raise RuntimeError(f"voice-{i}.wav rate {_rate}")
        samples = _peak_normalize(samples)
        offset = int(start * rate)
        for j, s in enumerate(samples):
            idx = offset + j
            if idx >= len(track):
                break
            mixed = int(track[idx] + s)
            track[idx] = max(-32767, min(32767, mixed))
        print(
            f"Placed VO {i + 1}: {start:.2f}s -> {start + len(samples) / rate:.2f}s",
            flush=True,
        )
    out = OUT / "voice-track.wav"
    _write_wav_mono16(out, rate, track)
    return out


def music(total: float) -> None:
    sr = 48000
    n = int(sr * total)
    samples = array.array("f", [0.0]) * n
    bpm = 118.0
    beat = 60.0 / bpm

    def add(at: float, value: float) -> None:
        idx = int(at * sr)
        if 0 <= idx < n:
            samples[idx] += value

    def tone(onset: float, hz: float, length: float, amp: float, decay: float) -> None:
        length_n = int(sr * min(length, max(0.0, total - onset)))
        for k in range(length_n):
            t = k / sr
            env = min(1.0, t / 0.006) * math.exp(-decay * t)
            wave_v = math.sin(2 * math.pi * hz * t) + 0.28 * math.sin(4 * math.pi * hz * t)
            add(onset + t, amp * env * wave_v)

    def kick(onset: float) -> None:
        length_n = int(sr * 0.18)
        for k in range(length_n):
            t = k / sr
            env = math.exp(-18 * t)
            hz = 95 * math.exp(-12 * t) + 45
            add(onset + t, 0.22 * env * math.sin(2 * math.pi * hz * t))

    def snare(onset: float) -> None:
        length_n = int(sr * 0.12)
        for k in range(length_n):
            t = k / sr
            env = math.exp(-28 * t)
            noise = ((k * 1103515245 + 12345) & 0x7FFF) / 32767.0 * 2 - 1
            add(onset + t, 0.09 * env * noise)

    def hat(onset: float) -> None:
        length_n = int(sr * 0.05)
        for k in range(length_n):
            t = k / sr
            env = math.exp(-55 * t)
            noise = ((k * 214013 + 2531011) & 0x7FFF) / 32767.0 * 2 - 1
            add(onset + t, 0.045 * env * noise)

    chords = [
        (261.63, 329.63, 392.00),
        (196.00, 246.94, 293.66),
        (220.00, 261.63, 329.63),
        (174.61, 220.00, 261.63),
    ]
    bars = int(math.ceil(total / (beat * 4))) + 1
    for bar in range(bars):
        chord = chords[bar % len(chords)]
        bar_t = bar * beat * 4
        for hz in chord:
            tone(bar_t, hz, beat * 4.1, 0.035, 1.4)
            tone(bar_t, hz * 2, beat * 4.1, 0.018, 1.8)
        for b in range(4):
            onset = bar_t + b * beat
            if onset >= total:
                break
            kick(onset)
            if b in (1, 3):
                snare(onset)
            hat(onset)
            hat(onset + beat * 0.5)
        arps = [chord[0], chord[1], chord[2], chord[1] * 2, chord[2] * 2, chord[0] * 2]
        for i, hz in enumerate(arps):
            tone(bar_t + i * (beat / 2), hz, 0.55, 0.07, 5.5)

    for i, hz in enumerate([523.25, 659.25, 783.99, 1046.5]):
        tone(0.05 + i * 0.12, hz, 0.45, 0.08, 7.0)

    peak = max((abs(s) for s in samples), default=1.0) or 1.0
    gain = min(0.92 / peak, 1.35)
    pcm = array.array("h")
    for i, sample in enumerate(samples):
        remaining = total - i / sr
        fade = min(1.0, remaining / 0.7) if remaining < 0.7 else 1.0
        intro = min(1.0, (i / sr) / 0.35)
        pcm.append(int(max(-1.0, min(1.0, sample * gain * fade * intro)) * 32767))

    with wave.open(str(OUT / "music-original.wav"), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sr)
        wav.writeframes(pcm.tobytes())


def mix_and_mux(total: float, voice_track: Path) -> None:
    run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            "-i",
            str(voice_track),
            "-i",
            str(OUT / "music-original.wav"),
            "-filter_complex",
            (
                "[0:a]volume=1.3,alimiter=limit=0.95[voice];"
                "[1:a]volume=0.36[music];"
                "[voice][music]amix=inputs=2:duration=first:normalize=0,"
                "alimiter=limit=0.97[a]"
            ),
            "-map",
            "[a]",
            "-t",
            f"{total:.3f}",
            str(OUT / "soundtrack.wav"),
        ]
    )

    run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-y",
            "-i",
            str(OUT / "kaila-gadget-repair-reel-v1.mp4"),
            "-i",
            str(OUT / "soundtrack.wav"),
            "-map",
            "0:v",
            "-map",
            "1:a",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-t",
            f"{total:.3f}",
            "-movflags",
            "+faststart",
            str(OUT / "kaila-gadget-repair-reel-v1-with-audio.mp4"),
        ]
    )


def rebuild_video(scene_durs: list[float]) -> float:
    scenes = [OUT / f"scene-{i}.png" for i in range(1, 5)]
    for p in scenes:
        if not p.exists():
            raise FileNotFoundError(p)

    inputs: list[str] = []
    for path, dur in zip(scenes, scene_durs, strict=True):
        inputs.extend(["-loop", "1", "-t", f"{dur:.3f}", "-i", str(path)])

    offsets: list[float] = []
    running = scene_durs[0]
    for i in range(1, len(scene_durs)):
        offsets.append(running - FADE)
        running = running + scene_durs[i] - FADE
    total = running

    parts: list[str] = []
    for i in range(len(scenes)):
        parts.append(
            f"[{i}:v]fps=30,scale=1080:1920:flags=lanczos,format=yuv420p,settb=AVTB[v{i}]"
        )
    prev = "v0"
    for i in range(1, len(scenes)):
        out = "v" if i == len(scenes) - 1 else f"xf{i}"
        parts.append(
            f"[{prev}][v{i}]xfade=transition=fade:duration={FADE}:offset={offsets[i - 1]:.3f}[{out}]"
        )
        prev = out

    mp4 = OUT / "kaila-gadget-repair-reel-v1.mp4"
    run(
        [
            "ffmpeg",
            "-y",
            *inputs,
            "-filter_complex",
            ";".join(parts),
            "-map",
            "[v]",
            "-t",
            f"{total:.3f}",
            "-r",
            "30",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(mp4),
        ]
    )
    print(f"Rebuilt silent video: {total:.2f}s", flush=True)
    return total


async def main() -> None:
    vo_durs = await generate_voice_files()
    placements, audio_total, scene_durs = place_segments(vo_durs)
    video_total = rebuild_video(scene_durs)
    total = max(audio_total, video_total)
    voice_track = build_voice_track(placements, total)
    music(total)
    mix_and_mux(total, voice_track)

    (OUT / "audio-notes.txt").write_text(
        "AI narration: Filipino Blessica. "
        "Questions are full single sentences (Hoy! kept; no spliced repair/nimo tails). "
        "Voice timeline is a single continuous track. "
        "Spoken 'kyu ar code' = on-screen 'QR code'. "
        "Cebuano pronunciation still needs human review.\n",
        encoding="utf-8",
    )
    print(f"Done. Total ~{total:.1f}s -> kaila-gadget-repair-reel-v1-with-audio.mp4", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
