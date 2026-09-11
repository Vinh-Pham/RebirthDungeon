#!/usr/bin/env python3
"""Read-only addon/native/template inventory; runtime qualification lives in fixtures."""
import argparse
import configparser
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def command(*args):
    result = subprocess.run(args, text=True, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, timeout=20)
    return {"exit_code": result.returncode, "output": result.stdout.strip()}


def fingerprint(path):
    return {"path": str(path.relative_to(ROOT)), "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--godot", required=True)
    args = parser.parse_args()
    report = {"engine": command(args.godot, "--version"),
              "host": {"system": platform.system(), "machine": platform.machine(),
                       "release": platform.release(), "macos": platform.mac_ver()[0]},
              "addons": {}, "native_libraries": {}, "templates": {}}
    for name in ["beckett", "godot_state_charts", "dialogue_manager", "phantom_camera", "quest_system"]:
        config = configparser.ConfigParser()
        config.read(ROOT / "addons" / name / "plugin.cfg")
        report["addons"][name] = {"version": config["plugin"]["version"].strip('"')}
    report["addons"]["limboai"] = {"version": (ROOT / "addons/limboai/version.txt").read_text().strip()}
    config = configparser.ConfigParser()
    config.read(ROOT / "addons/limboai/bin/limboai.gdextension")
    for target, value in config["libraries"].items():
        path = ROOT / value.strip('"').removeprefix("res://")
        files = sorted(p for p in path.rglob("*") if p.is_file()) if path.is_dir() else [path]
        report["native_libraries"][target] = {"exists": path.exists(), "files": [
            {**fingerprint(p), "format": command("file", "-b", str(p))["output"]}
            for p in files if p.is_file()]}
    pin = json.loads((ROOT / "tools/export-templates.json").read_text())
    templates = Path.home() / "Library/Application Support/Godot/export_templates" / pin["template_version"]
    for target, files in pin["required_files"].items():
        report["templates"][target] = {name: (templates / name).is_file() for name in files}
    report["prerequisites"] = {
        "template_directory": str(templates),
        "android_sdk_present": (Path(os.environ.get("ANDROID_HOME", str(Path.home() / "Library/Android/sdk")))).is_dir(),
        "java": command("/usr/bin/java", "-version"),
        "xcode_selection": command("/usr/bin/xcode-select", "-p"),
        "iphoneos_sdk": command("/usr/bin/xcrun", "--sdk", "iphoneos", "--show-sdk-path"),
        "device_acceptance": "Not performed; library presence is not export or device proof.",
    }
    mapped = command("/usr/sbin/lsof", "-n", "-c", "Godot")
    report["host_mapped_limboai"] = [line for line in mapped["output"].splitlines() if "liblimboai" in line]
    report["source_fingerprints"] = [fingerprint(ROOT / name) for name in [
        "project.godot", "addons/godot_state_charts/serialized_state_chart_state.gd",
        "assets/licenses/third_party_notices.txt"]]
    output = ROOT / "build/verification/addon-inventory.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n")
    print(output)


if __name__ == "__main__":
    main()
