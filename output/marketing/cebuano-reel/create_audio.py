"""Generate an AI narration draft and an original quiet instrumental bed."""
import asyncio
import array
import json
import math
from pathlib import Path
import subprocess
import wave
import edge_tts

OUT = Path(__file__).resolve().parent
VOICE = 'fil-PH-BlessicaNeural'
SEGMENTS = [
    ('Naay guba sa balay?', 0.25, 2.5),
    ('Pangita og serbisyo duol nimo.', 3.25, 2.95),
    ('Nindot kung naa kay Kaila.', 6.75, 2.95),
]

def run(args):
    subprocess.run(args, check=True)

async def narration():
    for i, (text, start, maximum) in enumerate(SEGMENTS):
        target = OUT / f'voice-{i}.mp3'
        await edge_tts.Communicate(text, VOICE, rate='+5%').save(str(target))
        probe = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(target)])
        duration = float(json.loads(probe)['format']['duration'])
        speed = max(1, duration / maximum)
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(target), '-af', f'atempo={speed},afade=t=in:d=0.025,adelay={int(start*1000)}:all=1,apad,atrim=duration=10', '-ar', '48000', str(OUT / f'timed-{i}.wav')])
        print(f'Generated segment {i+1}: {duration:.2f}s, speed {speed:.2f}', flush=True)

def music():
    sr = 48000
    samples = array.array('f', [0]) * (sr * 10)
    # Original C-major plucked pattern; no sampled or third-party music.
    notes = [261.63, 329.63, 392.00, 523.25, 293.66, 349.23, 440.00, 587.33,
             261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 523.25]
    for index, hz in enumerate(notes):
        onset = 0.1 + index * 0.6
        for k in range(int(sr * min(1.2, 10-onset))):
            t = k / sr
            envelope = min(1, t/.008) * math.exp(-5*t)
            value = .065 * envelope * (math.sin(2*math.pi*hz*t) + .25*math.sin(4*math.pi*hz*t))
            samples[int(onset*sr)+k] += value
    pcm = array.array('h')
    for i, sample in enumerate(samples):
        fade = min(1, (10-i/sr)/.65)
        pcm.append(int(max(-1, min(1, sample*fade))*32767))
    with wave.open(str(OUT/'music-original.wav'), 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sr)
        wav.writeframes(pcm.tobytes())

asyncio.run(narration())
music()
run(['ffmpeg', '-v', 'error', '-y', '-i', str(OUT/'timed-0.wav'), '-i', str(OUT/'timed-1.wav'), '-i', str(OUT/'timed-2.wav'), '-i', str(OUT/'music-original.wav'), '-filter_complex', '[0:a][1:a][2:a]amix=inputs=3:normalize=0,alimiter=limit=0.9[voice];[voice][3:a]amix=inputs=2:normalize=0,alimiter=limit=0.95[a]', '-map', '[a]', '-t', '10', str(OUT/'soundtrack.wav')])
run(['ffmpeg', '-v', 'error', '-y', '-i', str(OUT/'kaila-cebuano-10s.mp4'), '-i', str(OUT/'soundtrack.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', '10', '-movflags', '+faststart', str(OUT/'kaila-cebuano-10s-with-audio.mp4')])
(OUT/'audio-notes.txt').write_text('AI-generated narration using the Filipino Blessica voice reading Cebuano copy. Cebuano pronunciation needs human review. Music is an original synthesized plucked-note pattern.\n', encoding='utf-8')
