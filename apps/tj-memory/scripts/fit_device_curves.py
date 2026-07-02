from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "web_gui"


PARAM_META = {
    "gain": (1.0, 6500.0),
    "dark": (-600.0, 600.0),
    "tauRise": (0.005, 1.2),
    "tauDecay": (0.03, 120.0),
    "retention": (0.0, 0.95),
}


def load_curve(name: str):
    df = pd.read_excel(ROOT / f"{name}.xlsx", header=None).dropna()
    t = df.iloc[:, 0].astype(float).to_numpy()
    current_na = df.iloc[:, 1].astype(float).to_numpy() * 1e9
    idx0 = int(np.argmin(current_na[t < 20])) if np.any(t < 20) else 0
    if name == "LTM":
        # The provided LTM trace contains a late negative offset/erase tail.
        # For a positive photocurrent compact model, remove the final dark offset.
        dark_offset = float(np.median(current_na[-80:]))
    else:
        dark_offset = 0.0
    shifted_t = t[idx0:] - t[idx0]
    shifted_i = current_na[idx0:] - dark_offset
    return {
        "name": name,
        "source": f"{name}.xlsx",
        "t_abs": t,
        "current_raw_na": current_na,
        "t": shifted_t,
        "current_na": shifted_i,
        "t0_abs": float(t[idx0]),
        "dark_offset_na": dark_offset,
    }


def pulse_drive(t, frequency=1.0, duty=0.34, pulse_count=30):
    period = 1.0 / frequency
    phase = np.mod(t, period)
    pulse_index = np.floor(t / period)
    return ((pulse_index >= 0) & (pulse_index < pulse_count) & (phase <= period * duty)).astype(float)


def response(t, drive, p):
    trace = np.zeros_like(t, dtype=float)
    current = p["dark"]
    for k in range(len(t)):
        dt = 0.0 if k == 0 else float(t[k] - t[k - 1])
        target = p["dark"] + drive[k] * p["gain"]
        tau = p["tauRise"] if target > current else p["tauDecay"]
        alpha = 1.0 - np.exp(-dt / max(0.001, tau))
        current += (target - current) * alpha
        if drive[k] < 0.02:
            retained = p["dark"] + p["gain"] * p["retention"]
            current = retained + (current - retained) * np.exp(-dt / max(0.001, p["tauDecay"]))
        trace[k] = current
    return np.maximum(0.0, trace)


def rmse(a, b):
    return float(np.sqrt(np.mean((a - b) ** 2)))


def fit_curve(curve, mode):
    t = curve["t"]
    y = curve["current_na"]
    if mode == "LTM":
        # Fit before the late erase/drop region; the compact LTM model represents
        # memory retention, not the external reset segment.
        keep = t < 112.0
        t = t[keep]
        y = y[keep]

    y = np.maximum(0.0, y)
    rng = np.random.default_rng(20260702 + (0 if mode == "STM" else 1))
    peak = float(np.max(y))
    dark0 = float(np.percentile(y, 2))

    best = None
    duty_values = np.linspace(0.10, 0.55, 10)
    for duty in duty_values:
        drive = pulse_drive(t, duty=float(duty))
        for _ in range(2600):
            if mode == "STM":
                tau_decay = float(10 ** rng.uniform(np.log10(1.0), np.log10(70.0)))
                retention = float(rng.uniform(0.0, 0.12))
            else:
                tau_decay = float(10 ** rng.uniform(np.log10(5.0), np.log10(120.0)))
                retention = float(rng.uniform(0.25, 0.85))
            p = {
                "gain": float(rng.uniform(0.65 * peak, 1.55 * peak)),
                "dark": float(np.clip(dark0 + rng.normal(0, max(3.0, peak * 0.01)), *PARAM_META["dark"])),
                "tauRise": float(10 ** rng.uniform(np.log10(0.01), np.log10(0.55))),
                "tauDecay": tau_decay,
                "retention": retention,
                "noise": 0.0,
            }
            pred = response(t, drive, p)
            score = rmse(pred, y)
            if best is None or score < best["rmse"]:
                best = {"rmse": score, "duty": float(duty), "params": p, "pred": pred}

    # Local coordinate refinement around random-search winner.
    assert best is not None
    p = dict(best["params"])
    duty = best["duty"]
    for scale in [0.35, 0.18, 0.08, 0.035]:
        changed = True
        while changed:
            changed = False
            drive = pulse_drive(t, duty=duty)
            base_score = rmse(response(t, drive, p), y)
            trials = []
            for key, (lo, hi) in PARAM_META.items():
                center = p[key]
                span = max((hi - lo) * 0.002, abs(center) * scale)
                for sign in [-1, 1]:
                    q = dict(p)
                    q[key] = float(np.clip(center + sign * span, lo, hi))
                    trials.append((rmse(response(t, drive, q), y), q, duty))
            for dd in [-scale * 0.25, scale * 0.25]:
                nd = float(np.clip(duty + dd, 0.06, 0.70))
                trials.append((rmse(response(t, pulse_drive(t, duty=nd), p), y), dict(p), nd))
            score, q, nd = min(trials, key=lambda x: x[0])
            if score + 1e-9 < base_score:
                p, duty, changed = q, nd, True

    final_drive = pulse_drive(t, duty=duty)
    final_pred = response(t, final_drive, p)
    return {
        "mode": mode,
        "fitWindowS": [float(t[0]), float(t[-1])],
        "frequencyHz": 1.0,
        "duty": float(duty),
        "pulseCount": 30,
        "rmseNa": rmse(final_pred, y),
        "params": {k: float(v) for k, v in p.items()},
    }


def sample_curve(curve, max_points=360):
    t = curve["t"]
    y = curve["current_na"]
    if len(t) <= max_points:
        idx = np.arange(len(t))
    else:
        idx = np.unique(np.linspace(0, len(t) - 1, max_points).astype(int))
    return [[round(float(t[i]), 5), round(float(y[i]), 6)] for i in idx]


def csv_text(points):
    rows = ["# time_s,current_nA"]
    rows.extend(f"{t:.5f},{i:.6f}" for t, i in points)
    return "\n".join(rows)


def write_js(curves, fits):
    payload = {}
    for mode, curve in curves.items():
        points = sample_curve(curve)
        payload[mode] = {
            "sourceFile": curve["source"],
            "timeZeroOriginalS": curve["t0_abs"],
            "darkOffsetNa": curve["dark_offset_na"],
            "currentUnit": "nA after dark-offset correction",
            "points": points,
            "csv": csv_text(points),
            "fit": fits[mode],
        }

    out = WEB / "device-baseline-curves.js"
    out.write_text(
        "window.DEVICE_BASELINE_CURVES = "
        + json.dumps(payload, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    return out


def main():
    curves = {mode: load_curve(mode) for mode in ["STM", "LTM"]}
    fits = {mode: fit_curve(curves[mode], mode) for mode in ["STM", "LTM"]}
    out = write_js(curves, fits)
    print(out)
    print(json.dumps(fits, indent=2))


if __name__ == "__main__":
    main()
