# Music bed + SFX generated in code (no external assets). Pad chords A–G–F–G as in the playbook,
# but louder since a story has no voice-over, plus a soft pulse and hits synced to the animation.
import numpy as np, wave
SR = 48000; DUR = 30.0; N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(3)
def env(n, a, r):
    e = np.ones(n); A = int(a * SR); R = int(r * SR)
    if A: e[:A] = np.linspace(0, 1, A)
    if R: e[-R:] *= np.linspace(1, 0, R)
    return e
L = np.zeros(N); Rr = np.zeros(N)
def add(sig, at, pan=0.0, g=1.0):
    i = int(at * SR); sig = sig[: max(0, N - i)]
    L[i:i + len(sig)] += sig * g * (1 - pan) ; Rr[i:i + len(sig)] += sig * g * (1 + pan)
f = lambda m: 440 * 2 ** ((m - 69) / 12)
# ── pad: 4 chords per 7.5s cycle (A minor, G, F, G), detuned saws softened
CH = [[57, 60, 64, 69], [55, 59, 62, 67], [53, 57, 60, 65], [55, 59, 62, 67]]
seg = 3.75
for k in range(8):
    ch = CH[k % 4]; n = int(seg * SR) + int(0.6 * SR); tt = np.arange(n) / SR; s = np.zeros(n)
    for m in ch:
        for d in (-0.08, 0.0, 0.08):
            ph = 2 * np.pi * f(m + d) * tt
            s += np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
    s *= env(n, 0.9, 1.0) / 30
    add(s, k * seg, pan=(-0.25 if k % 2 else 0.25), g=0.55)
# bass (root, from the reveal)
for k in range(1, 8):
    root = CH[k % 4][0] - 24; n = int(seg * SR); tt = np.arange(n) / SR
    add(np.sin(2 * np.pi * f(root) * tt) * env(n, 0.05, 0.4) * 0.22, k * seg)
# ── pulse: soft kick + hat at 96 BPM, enters at 3.3s ("one system")
beat = 60 / 96
def kick():
    n = int(0.35 * SR); tt = np.arange(n) / SR
    fr = 110 * np.exp(-tt * 18) + 45
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt * 9)
def hat():
    n = int(0.06 * SR); x = rng.standard_normal(n); x = np.diff(np.concatenate([[0], x]))
    return x * np.exp(-np.arange(n) / SR * 70)
b = 3.3
while b < 29.2:
    add(kick(), b, g=0.42); add(hat(), b + beat / 2, pan=0.3, g=0.05); b += beat
# ── sfx
def whoosh(d=0.6, up=True):
    n = int(d * SR); x = rng.standard_normal(n); out = np.zeros(n); a = 0.0
    cut = np.linspace(0.02, 0.25, n) if up else np.linspace(0.25, 0.02, n)
    for i in range(n): a += cut[i] * (x[i] - a); out[i] = a
    return out * np.sin(np.linspace(0, np.pi, n)) ** 2 * 1.3
def ping(m, d=0.5, g=1):
    n = int(d * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * f(m) * tt) + 0.3 * np.sin(2 * np.pi * f(m + 12) * tt)) * np.exp(-tt * 9) * g
def tick():
    n = int(0.05 * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 120)
def boom():
    n = int(1.6 * SR); tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * (55 * np.exp(-tt * 3) + 35) * tt) * np.exp(-tt * 2.6)
    return s + whoosh(1.6, False) * 0.35 * np.exp(-tt * 2)
for i in range(9): add(tick(), 0.45 + i * 0.13, pan=(i % 3 - 1) * 0.5, g=0.18)
for i in range(9): add(tick(), 1.7 + i * 0.07, g=0.10)
add(whoosh(0.5), 2.75, g=0.15)
add(whoosh(0.9), 3.15, g=0.32)
for i in range(9): add(ping(81 + (i % 4) * 2, 0.35, 0.10), 4.5 + i * 0.1)
add(boom(), 5.0, g=0.55); add(ping(81, 1.4, 0.18), 5.0); add(ping(88, 1.4, 0.12), 5.05)
for at in (7.0, 12.3, 16.7, 21.45, 25.3): add(whoosh(0.7), at - 0.25, g=0.32)
for i, at in enumerate([7.55, 7.85, 8.15, 8.45, 8.75]): add(ping([76, 79, 81, 84, 86][i], 0.6, 0.16), at, pan=(-1) ** i * 0.4)
for i, at in enumerate([10.75, 10.95, 11.15]): add(ping([88, 91, 93][i], 0.5, 0.15), at)
add(ping(84, 0.7, 0.14), 14.6)
for i in range(4): add(ping([79, 81, 84, 86][i], 0.45, 0.13), 18.7 + i * 0.32)
for i in range(4): add(ping(93, 0.3, 0.09), 20.3 + i * 0.15)
for i in range(9): add(ping([76, 79, 81, 84, 86, 88, 91, 93, 96][i], 0.4, 0.09), 25.75 + i * 0.12)
add(boom(), 27.05, g=0.45); add(ping(81, 1.8, 0.16), 27.3); add(ping(88, 1.8, 0.1), 27.35)
# master: fade in/out, soft limit
fade = np.ones(N); fade[: int(0.3 * SR)] = np.linspace(0, 1, int(0.3 * SR)); fade[-int(1.6 * SR):] = np.linspace(1, 0, int(1.6 * SR))
st = np.stack([L, Rr], 1) * fade[:, None]
st = np.tanh(st * 1.6) / 1.6
st = st / np.max(np.abs(st)) * 0.89
with wave.open("out/music.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype("<i2").tobytes())
print("ok")
