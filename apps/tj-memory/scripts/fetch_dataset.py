#!/usr/bin/env python3
"""
Fetch or synthesize datasets for the UV STM/LTM simulator.

This script is intentionally explicit: it stores files under web_gui/datasets/
and writes a status JSON that the GUI/backend can use later. Large event
datasets should be fetched on demand, not bundled into the static app.
"""

from __future__ import annotations

import argparse
import gzip
import json
import math
import os
from pathlib import Path
import random
import shutil
import sys
import time
from urllib.request import urlretrieve


ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = ROOT / "datasets"
STATUS_PATH = DATA_ROOT / "dataset_status.json"


DIRECT_FILES = {
    "mnist": [
        ("train-images-idx3-ubyte.gz", "https://storage.googleapis.com/cvdf-datasets/mnist/train-images-idx3-ubyte.gz"),
        ("train-labels-idx1-ubyte.gz", "https://storage.googleapis.com/cvdf-datasets/mnist/train-labels-idx1-ubyte.gz"),
        ("t10k-images-idx3-ubyte.gz", "https://storage.googleapis.com/cvdf-datasets/mnist/t10k-images-idx3-ubyte.gz"),
        ("t10k-labels-idx1-ubyte.gz", "https://storage.googleapis.com/cvdf-datasets/mnist/t10k-labels-idx1-ubyte.gz"),
    ],
    "fashionmnist": [
        ("train-images-idx3-ubyte.gz", "http://fashion-mnist.s3-website.eu-central-1.amazonaws.com/train-images-idx3-ubyte.gz"),
        ("train-labels-idx1-ubyte.gz", "http://fashion-mnist.s3-website.eu-central-1.amazonaws.com/train-labels-idx1-ubyte.gz"),
        ("t10k-images-idx3-ubyte.gz", "http://fashion-mnist.s3-website.eu-central-1.amazonaws.com/t10k-images-idx3-ubyte.gz"),
        ("t10k-labels-idx1-ubyte.gz", "http://fashion-mnist.s3-website.eu-central-1.amazonaws.com/t10k-labels-idx1-ubyte.gz"),
    ],
}

PHYSIONET_MITDB_BASE = "https://physionet.org/files/mitdb/1.0.0"


def load_status() -> dict:
    if STATUS_PATH.exists():
        return json.loads(STATUS_PATH.read_text(encoding="utf-8"))
    return {}


def write_status(dataset: str, payload: dict) -> None:
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    status = load_status()
    status[dataset] = {
        **payload,
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    }
    STATUS_PATH.write_text(json.dumps(status, indent=2), encoding="utf-8")


def fetch_url(url: str, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists() and out.stat().st_size > 0:
        print(f"exists {out}")
        return
    print(f"download {url}")
    urlretrieve(url, out)
    print(f"saved {out}")


def unpack_gzip(path: Path) -> Path:
    out = path.with_suffix("")
    if out.exists() and out.stat().st_size > 0:
        return out
    with gzip.open(path, "rb") as src, out.open("wb") as dst:
        shutil.copyfileobj(src, dst)
    return out


def fetch_idx_dataset(name: str, unpack: bool) -> None:
    target = DATA_ROOT / "raw" / name
    for filename, url in DIRECT_FILES[name]:
        gz = target / filename
        fetch_url(url, gz)
        if unpack:
            unpacked = unpack_gzip(gz)
            print(f"unpacked {unpacked}")
    write_status(name, {
        "state": "downloaded",
        "path": str(target.relative_to(ROOT)),
        "files": [item[0] for item in DIRECT_FILES[name]],
        "notes": "IDX files downloaded from public research dataset mirrors.",
    })


def fetch_mitbih(records: list[str]) -> None:
    target = DATA_ROOT / "raw" / "mitbih"
    suffixes = [".dat", ".hea", ".atr"]
    for record in records:
        for suffix in suffixes:
          fetch_url(f"{PHYSIONET_MITDB_BASE}/{record}{suffix}", target / f"{record}{suffix}")
    write_status("mitbih", {
        "state": "downloaded",
        "path": str(target.relative_to(ROOT)),
        "records": records,
        "notes": "MIT-BIH records fetched from PhysioNet. Use wfdb for full parsing.",
    })


def synthesize_uvtoy(samples: int) -> None:
    target = DATA_ROOT / "synthetic" / "uvtoy"
    target.mkdir(parents=True, exist_ok=True)
    rows = ["sample_id,class_id,time_s,uv_intensity"]
    random.seed(42)
    for sid in range(samples):
        class_id = sid % 4
        frequency = [3, 8, 16, 5][class_id]
        duty = [0.18, 0.35, 0.12, 0.65][class_id]
        intensity = [0.35, 0.8, 1.15, 0.65][class_id] * (0.92 + random.random() * 0.16)
        for step in range(240):
            t = step / 240 * 1.5
            phase = (t * frequency) % 1
            burst = 1 if phase < duty else 0
            if class_id == 2 and step % 37 > 5:
                burst = 0
            if class_id == 3:
                burst = 1 if (0.25 < t < 1.15) else burst * 0.25
            uv = max(0, burst * intensity + 0.02 * math.sin(step * 0.31))
            rows.append(f"{sid},{class_id},{t:.6f},{uv:.6f}")
    out = target / "uvtoy_timeseries.csv"
    out.write_text("\n".join(rows), encoding="utf-8")
    write_status("uvtoy", {
        "state": "generated",
        "path": str(target.relative_to(ROOT)),
        "samples": samples,
        "files": [out.name],
        "notes": "Synthetic UV pulse classes generated locally for device-specific STM/LTM tests.",
    })
    print(f"generated {out}")


def fetch_with_tonic(name: str) -> None:
    try:
        import tonic  # type: ignore
    except Exception:
        print("tonic is not installed. Install it in your Python env first:")
        print("  python -m pip install tonic")
        print(f"Then rerun: python scripts/fetch_dataset.py fetch {name} --tonic")
        write_status(name, {
            "state": "needs_tonic",
            "path": str((DATA_ROOT / "raw" / name).relative_to(ROOT)),
            "notes": "Install tonic, then rerun the fetch command.",
        })
        return

    target = DATA_ROOT / "raw" / name
    target.mkdir(parents=True, exist_ok=True)
    dataset_map = {
        "nmnist": lambda: tonic.datasets.NMNIST(save_to=str(target), train=True),
        "dvsgesture": lambda: tonic.datasets.DVSGesture(save_to=str(target), train=True),
        "shd": lambda: tonic.datasets.SHD(save_to=str(target), train=True),
    }
    if name not in dataset_map:
        raise ValueError(f"tonic fetch is not configured for {name}")
    ds = dataset_map[name]()
    write_status(name, {
        "state": "downloaded",
        "path": str(target.relative_to(ROOT)),
        "samples_indexed": len(ds),
        "notes": "Dataset initialized through tonic. Check original license/source terms before redistribution.",
    })
    print(f"tonic dataset ready: {name}, samples={len(ds)}, path={target}")


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)

    fetch = sub.add_parser("fetch")
    fetch.add_argument("dataset", choices=["mnist", "fashionmnist", "mitbih", "nmnist", "dvsgesture", "shd"])
    fetch.add_argument("--unpack", action="store_true")
    fetch.add_argument("--records", nargs="*", default=["100"], help="MIT-BIH record ids, e.g. 100 101 102")
    fetch.add_argument("--tonic", action="store_true")

    synth = sub.add_parser("synthesize")
    synth.add_argument("dataset", choices=["uvtoy"])
    synth.add_argument("--samples", type=int, default=160)

    args = parser.parse_args()
    if args.cmd == "fetch":
        if args.dataset in DIRECT_FILES:
            fetch_idx_dataset(args.dataset, args.unpack)
        elif args.dataset == "mitbih":
            fetch_mitbih(args.records)
        elif args.tonic:
            fetch_with_tonic(args.dataset)
        else:
            print(f"{args.dataset} uses event/spike dataset tooling. Re-run with --tonic.")
            print(f"  python scripts/fetch_dataset.py fetch {args.dataset} --tonic")
            write_status(args.dataset, {
                "state": "needs_tonic",
                "path": str((DATA_ROOT / "raw" / args.dataset).relative_to(ROOT)),
                "notes": "Use --tonic to fetch through Tonic.",
            })
    elif args.cmd == "synthesize":
        synthesize_uvtoy(args.samples)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
