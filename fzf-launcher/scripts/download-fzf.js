const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { pipeline } = require("stream/promises");
const tar = require("tar");
const AdmZip = require("adm-zip");

const VERSION = process.env.FZF_VERSION || "0.70.0";
const BASE_URL = `https://github.com/junegunn/fzf/releases/download/v${VERSION}`;

const DIST_BIN = path.resolve(__dirname, "..", "dist", "bin");
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "fzf-download-"));

function log(msg) {
  console.log(msg);
}

function request(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          resolve(request(res.headers.location));
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Failed to download ${url} (status ${res.statusCode})`));
          return;
        }
        resolve(res);
      })
      .on("error", reject);
  });
}

async function download(url, dest) {
  const res = await request(url);
  await pipeline(res, fs.createWriteStream(dest));
}

function moveFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  fs.chmodSync(dest, 0o755);
}

async function extractTarGz(archivePath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  await tar.x({ file: archivePath, cwd: outDir });
}

function extractZip(archivePath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const zip = new AdmZip(archivePath);
  zip.extractAllTo(outDir, true);
}

async function downloadAndExtract(target) {
  const url = `${BASE_URL}/${target.file}`;
  const archivePath = path.join(TMP_DIR, target.file);
  log(`Downloading ${url}`);
  await download(url, archivePath);

  const extractDir = path.join(TMP_DIR, target.name);
  if (target.file.endsWith(".tar.gz")) {
    await extractTarGz(archivePath, extractDir);
  } else if (target.file.endsWith(".zip")) {
    extractZip(archivePath, extractDir);
  }

  const binPath = path.join(extractDir, target.bin);
  if (!fs.existsSync(binPath)) {
    throw new Error(`Missing ${target.bin} in ${target.file}`);
  }

  const outPath = path.join(DIST_BIN, target.out);
  moveFile(binPath, outPath);
  log(`Saved ${outPath}`);
}

async function main() {
  fs.mkdirSync(DIST_BIN, { recursive: true });

  const targets = [
    {
      name: "linux_amd64",
      file: `fzf-${VERSION}-linux_amd64.tar.gz`,
      bin: "fzf",
      out: "fzf",
    },
    {
      name: "windows_amd64",
      file: `fzf-${VERSION}-windows_amd64.zip`,
      bin: "fzf.exe",
      out: "fzf.exe",
    },
  ];

  for (const target of targets) {
    await downloadAndExtract(target);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
