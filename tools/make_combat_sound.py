"""Generate the original, short placeholder combat cue (16-bit mono PCM)."""
import math
from pathlib import Path
import struct
import wave

path = Path(__file__).resolve().parents[1] / 'assets/audio/combat.wav'
path.parent.mkdir(parents=True, exist_ok=True)
rate = 22050
samples = 2205
with wave.open(str(path), 'wb') as output:
    output.setparams((1, 2, rate, samples, 'NONE', 'not compressed'))
    output.writeframes(b''.join(struct.pack('<h', int(6000 * (1 - i / samples) ** 2 * math.sin(2 * math.pi * (220 * i / rate + 400 * (i / rate) ** 2)))) for i in range(samples)))
