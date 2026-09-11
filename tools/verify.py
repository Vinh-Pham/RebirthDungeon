#!/usr/bin/env python3
"""Verify the pinned Godot baseline; retain logs and package manifests."""
import argparse
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "build" / "verification"
PIN = (ROOT / "tools" / "godot-version.txt").read_text().strip()
ERROR = re.compile(r"(^|\n)(?:SCRIPT ERROR:|ERROR:|Parse Error:)", re.MULTILINE)


def run(name, command, expected=0, marker=None):
    result = subprocess.run(command, cwd=ROOT, text=True, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, timeout=120,
                            env={**os.environ, "BECKETT_ENABLE": "0", "BECKETT_AUTO_CONFIG": "0"})
    output = result.stdout
    (OUT / (name + ".log")).write_text(
        "$ " + " ".join(command) + "\n" + output + f"\nEXIT_CODE: {result.returncode}\n")
    if result.returncode != expected or ERROR.search(output) or (marker and marker not in output):
        raise RuntimeError(f"{name} failed; see {OUT / (name + '.log')}")
    print(f"PASS {name} (exit {result.returncode})")
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--godot", default=os.environ.get("GODOT_BIN", "godot"))
    args = parser.parse_args()
    executable = shutil.which(args.godot)
    if not executable:
        raise RuntimeError("Set GODOT_BIN or --godot to the pinned Godot executable")
    OUT.mkdir(parents=True, exist_ok=True)
    (ROOT / "build" / ".gdignore").touch()
    version = run("version", [executable, "--version"]).strip()
    if version != PIN:
        raise RuntimeError(f"Expected {PIN}, got {version}")
    base = [executable, "--headless", "--path", str(ROOT)]
    run("import", base + ["--editor", "--import"])
    run("tests-pass", base + ["--script", "res://tests/run_tests.gd"], marker="TEST_RESULT: PASS")
    run("tests-failure", base + ["--script", "res://tests/run_tests.gd", "--", "--prove-failure"],
        expected=1, marker="TEST_RESULT: FAIL")
    run("runtime-smoke", base + ["--quit-after", "60"])
    for index, preset in enumerate(["macOS", "Windows Desktop", "Linux", "Android", "iOS"]):
        archive = OUT / f"assets-{index}.zip"
        run(f"pack-{index}", base + ["--export-pack", preset, str(archive)])
        with zipfile.ZipFile(archive) as package:
            names = sorted(package.namelist())
        (OUT / f"assets-{index}.txt").write_text("\n".join(names) + "\n")
        forbidden = ("addons/phantom_camera/examples/", "addons/phantom_camera/panel/",
                     "addons/phantom_camera/themes/", "addons/phantom_camera/fonts/", "demo/", "godot_state_charts_examples/", "docs/", "tests/", "tools/", "build/", ".firecrawl/", ".beckett/")
        leaked = [name for name in names if name.startswith(forbidden) or name.endswith((".md", ".cs"))
                  or name.endswith(("/ExampleBalloon.tscn", "/SmallExampleBalloon.tscn", "/DialogueLabel.tscn"))]
        if leaked:
            raise RuntimeError(f"{preset} ships development files: {leaked}")
        if not any(name.startswith("scenes/main.tscn") for name in names):
            raise RuntimeError(f"{preset} missing main scene")
        if "assets/licenses/third_party_notices.txt" not in names:
            raise RuntimeError(f"{preset} missing third-party license notices")
        if "project.binary" not in names:
            raise RuntimeError(f"{preset} missing project configuration")
        print(f"PASS {preset} asset exclusions ({len(names)} files)")
    print("BASELINE_VERIFICATION: PASS")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, subprocess.TimeoutExpired, zipfile.BadZipFile) as error:
        print(f"BASELINE_VERIFICATION: FAIL: {error}", file=sys.stderr)
        sys.exit(1)
