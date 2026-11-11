# Image → WebP Converter

Internal tool to convert any image format to WebP. Runs fully on your machine — no accounts, no API keys, no payments.

## Requirements

- **Node.js 18 or newer** — check with `node -v`. If missing, install from https://nodejs.org (LTS version).
- Works on Windows, macOS, and Linux.

## Setup (first time only)

```
cd "C:\Users\Danish\Desktop\image to webp"
npm install
```

## Run

```
npm start
```

Then open **http://localhost:3000** in your browser. Keep the terminal window open while using the tool; press `Ctrl+C` in it to stop the server.

## How to use

### Drag & Drop tab
Drop one or more images onto the page (or click to pick files). Each converted `.webp` downloads automatically, and the page shows original vs. new size with the % saved. There are also per-file Download links if you miss the auto-download.

### Bulk Folder tab
1. Enter the **input folder** path (e.g. `C:\Users\Danish\Pictures\originals`).
2. Enter the **output folder** path (created automatically if it doesn't exist).
3. Click **Convert folder** — every supported image in the input folder is converted and saved to the output folder. Originals are never modified.

If two source files would produce the same name (e.g. `logo.png` and `logo.jpg`), the second becomes `logo-2.webp` instead of overwriting.

### GIF handling
Every GIF produces **two** files:

| Output | What it is |
|---|---|
| `name.webp` | Animated WebP — all frames and timing preserved |
| `name-static.webp` | Non-animated WebP — a single frame |

The **"GIF static frame"** field (on both tabs, default `1`) picks which frame becomes the static WebP. Entering a number past the GIF's last frame uses the last frame.

## Supported input formats

JPG/JPEG, PNG, GIF, BMP, TIFF, AVIF, HEIC/HEIF, SVG, JP2, JXL, and WebP (re-compression).

## Quality & size

- Output quality is **90** with strong compression — visually identical, noticeably smaller files.
- Animated GIFs use compression effort 4 (the libwebp default): effort 6 is ~25× slower per frame for only ~3% smaller output.
- To change these, edit `WEBP_OPTS` / `ANIMATED_WEBP_OPTS` at the top of `converter.js`, then restart the server.

## Limits & notes

- The WebP format has a hard maximum of **16383 pixels per side**. Larger images are automatically downscaled to fit, keeping their aspect ratio.
- Uploads are capped at 200 MB per file (drag & drop mode). Bulk mode reads from disk, so it has no such cap.
- Bulk mode converts files directly in the folder you give it (not subfolders).
- Everything runs locally — images never leave your machine.

## Google Drive (optional)

Install the free [Google Drive for Desktop](https://www.google.com/drive/download/) app and your Drive appears as a local drive (e.g. `G:\My Drive`). You can then use Drive paths directly in the Bulk Folder tab — no code changes needed.

## Project files

| File | Purpose |
|---|---|
| `server.js` | Local Express server + the two API endpoints |
| `converter.js` | Conversion logic (sharp), quality settings |
| `public/index.html` | The web page (both tabs) |

## Troubleshooting

- **"Port 3000 already in use"** — another copy is running. Close it, or run with another port: `set PORT=3001 && npm start`, then open http://localhost:3001.
- **Page doesn't load** — make sure the terminal shows `Image → WebP converter running at http://localhost:3000` and that you ran `npm install` once.
- **A file fails to convert** — the page shows the error next to that file; other files still convert normally.
