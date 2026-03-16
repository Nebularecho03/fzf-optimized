#!/usr/bin/env python3
import json
import os
import shutil
import subprocess
import sys
import tarfile
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLIENT_DIR = ROOT / "client"
DIST_BIN = ROOT / "dist" / "bin"
DIST_NATIVE = ROOT / "dist" / "native"


def run(cmd, cwd=None):
    print(f"+ {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    if result.returncode != 0:
        sys.exit(result.returncode)


def ensure_tool(name, hint):
    if shutil.which(name) is None:
        print(f"Missing required tool: {name}")
        print(hint)
        sys.exit(1)


def ensure_node_modules():
    if not (ROOT / "node_modules").exists():
        run("npm install", cwd=ROOT)
    if not (CLIENT_DIR / "node_modules").exists():
        run("npm install", cwd=CLIENT_DIR)


def ensure_fzf_bins():
    if not (DIST_BIN / "fzf").exists() or not (DIST_BIN / "fzf.exe").exists():
        run("npm run download:fzf", cwd=ROOT)

def read_better_sqlite3_version():
    pkg_path = ROOT / "node_modules" / "better-sqlite3" / "package.json"
    if not pkg_path.exists():
        return None
    with pkg_path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("version")


def download_file(urls, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    last_err = None
    for url in urls:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "fzf-launcher-builder"})
            with urllib.request.urlopen(req) as r, open(dest, "wb") as f:
                shutil.copyfileobj(r, f)
            return
        except Exception as err:
            last_err = err
            if dest.exists():
                dest.unlink()
            continue
    raise last_err


def extract_tar_gz(archive, out_dir):
    out_dir.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive, "r:gz") as tf:
        tf.extractall(out_dir)


def extract_zip(archive, out_dir):
    out_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive, "r") as zf:
        zf.extractall(out_dir)


def ensure_better_sqlite3_prebuilds():
    version = read_better_sqlite3_version()
    if not version:
        print("better-sqlite3 is not installed. Run npm install first.")
        sys.exit(1)

    targets = [
        {
            "platform_key": "linux-x64",
            "filename": f"better-sqlite3-v{version}-node-v108-linux-x64.tar.gz",
            "extract": "tar",
            "node_file": "better_sqlite3.node",
        },
        {
            "platform_key": "win32-x64",
            "filename": f"better-sqlite3-v{version}-node-v108-win32-x64.tar.gz",
            "extract": "tar",
            "node_file": "better_sqlite3.node",
        },
    ]

    for target in targets:
        out_dir = DIST_NATIVE / target["platform_key"]
        out_node = out_dir / target["node_file"]
        if out_node.exists():
            continue

        urls = [
            "https://downloads.sourceforge.net/project/better-sqlite3.mirror/"
            f"v{version}/{target['filename']}",
            "https://sourceforge.net/projects/better-sqlite3.mirror/files/"
            f"v{version}/{target['filename']}/download",
            "https://github.com/WiseLibs/better-sqlite3/releases/download/"
            f"v{version}/{target['filename']}",
        ]
        archive = ROOT / "dist" / target["filename"]
        print(f"Downloading {target['filename']}")
        download_file(urls, archive)

        temp_dir = ROOT / "dist" / f"tmp-{target['platform_key']}"
        if temp_dir.exists():
            shutil.rmtree(temp_dir)

        if target["extract"] == "tar":
            extract_tar_gz(archive, temp_dir)
        else:
            extract_zip(archive, temp_dir)

        extracted = temp_dir / "build" / "Release" / target["node_file"]
        if not extracted.exists():
            print(f"Missing {target['node_file']} in {archive}")
            sys.exit(1)

        out_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(extracted, out_node)
        print(f"Saved {out_node}")


def main():
    ensure_tool("node", "Install Node.js 18+ and ensure 'node' is on PATH.")
    ensure_tool("npm", "Install npm (bundled with Node.js).")
    ensure_tool("python3", "Python 3 is required to run this script.")

    ensure_node_modules()

    run("npm run build:client", cwd=ROOT)
    ensure_fzf_bins()
    ensure_better_sqlite3_prebuilds()

    run("npx --yes pkg . --targets node18-win-x64,node18-linux-x64 --out-path dist", cwd=ROOT)
    write_launchers()


def write_launchers():
    dist_dir = ROOT / "dist"
    dist_dir.mkdir(parents=True, exist_ok=True)

    linux_sh = dist_dir / "start-fzf-launcher.sh"
    linux_sh.write_text(
        "#!/usr/bin/env bash\n"
        "DIR=\"$(cd \"$(dirname \"$0\")\" && pwd)\"\n"
        "nohup \"$DIR/fzf-launcher-linux\" --detach >/dev/null 2>&1 &\n"
        "disown >/dev/null 2>&1 || true\n"
    )
    linux_sh.chmod(0o755)

    win_vbs = dist_dir / "start-fzf-launcher.vbs"
    win_vbs.write_text(
        "Set WshShell = CreateObject(\"WScript.Shell\")\n"
        "WshShell.Run Chr(34) & \"fzf-launcher-win.exe\" & Chr(34) & \" --detach\", 0\n"
        "Set WshShell = Nothing\n"
    )

    win_bat = dist_dir / "start-fzf-launcher.bat"
    win_bat.write_text(
        "@echo off\n"
        "cd /d \"%~dp0\"\n"
        "wscript start-fzf-launcher.vbs\n"
    )


if __name__ == "__main__":
    main()
