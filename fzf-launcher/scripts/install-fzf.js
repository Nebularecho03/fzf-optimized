#!/usr/bin/env node
"use strict";

const https = require("https");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const os = require("os");

const VERSION = "0.54.3";
const BIN_DIR = path.join(__dirname, "..", "bin");

const PLATFORM_MAP = {
  linux: { arch: { x64: "linux_amd64", arm64: "linux_arm64" } },
  darwin: { arch: { x64: "darwin_amd64", arm64: "darwin_arm64" } },
  win32: { arch: { x64: "windows_amd64", arm64: "windows_arm64" } },
};

function getPlatformInfo() {
  const plat = process.platform;
  const arch = process.arch;
  const info = PLATFORM_MAP[plat];
  if (!info) throw new Error(`Unsupported platform: ${plat}`);
  const archKey = info.arch[arch];
  if (!archKey) throw new Error(`Unsupported arch: ${arch}`);
  const isWin = plat === "win32";
  const ext = isWin ? ".exe" : "";
  const archiveName = `fzf-${VERSION}-${archKey}.${isWin ? "zip" : "tar.gz"}`;
  const binaryName = `fzf${ext}`;
  return { archiveName, binaryName, isWin };
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const follow = (u) => {
      https.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          return follow(res.headers.location);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
        file.on("error", reject);
      }).on("error", reject);
    };
    follow(url);
  });
}

async function main() {
  const { archiveName, binaryName, isWin } = getPlatformInfo();
  const url = `https://github.com/junegunn/fzf/releases/download/v${VERSION}/${archiveName}`;
  const archivePath = path.join(os.tmpdir(), archiveName);
  const destBin = path.join(BIN_DIR, binaryName);

  if (fs.existsSync(destBin)) {
    console.log(`fzf already exists at ${destBin} — skipping download.`);
    return;
  }

  fs.mkdirSync(BIN_DIR, { recursive: true });
  console.log(`Downloading fzf v${VERSION} for ${process.platform}/${process.arch}...`);
  console.log(`  → ${url}`);
  await download(url, archivePath);
  console.log("Extracting...");

  if (isWin) {
    execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${BIN_DIR}' -Force"`, { stdio: "inherit" });
  } else {
    execSync(`tar -xzf "${archivePath}" -C "${BIN_DIR}" fzf`, { stdio: "inherit" });
    fs.chmodSync(destBin, 0o755);
  }

  fs.unlinkSync(archivePath);
  console.log(`fzf installed at ${destBin}`);
}

main().catch((err) => {
  console.error("Failed to install fzf:", err.message);
  console.error("Please install fzf manually: https://github.com/junegunn/fzf#installation");
  process.exit(1);
});
