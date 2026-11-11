const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const { convertBuffer, isSupported } = require("./converter");

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// ---- Drag & drop: convert uploaded files, return results as base64 ----
app.post("/api/convert", upload.array("images", 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }
    const results = [];
    for (const file of req.files) {
      const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
      if (!isSupported(originalName)) {
        results.push({ original: originalName, error: "Unsupported format" });
        continue;
      }
      try {
        const outputs = await convertBuffer(file.buffer, originalName, {
          staticFrame: req.body.staticFrame,
        });
        results.push({
          original: originalName,
          originalSize: file.size,
          files: outputs.map((o) => ({
            name: o.name,
            size: o.buffer.length,
            data: o.buffer.toString("base64"),
          })),
        });
      } catch (err) {
        results.push({ original: originalName, error: err.message });
      }
    }
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Bulk: convert every image in inputDir, write WebP files to outputDir ----
app.post("/api/convert-folder", async (req, res) => {
  const { inputDir, outputDir, staticFrame } = req.body || {};
  if (!inputDir || !outputDir) {
    return res.status(400).json({ error: "Both input and output folder are required" });
  }
  try {
    const stat = await fs.stat(inputDir).catch(() => null);
    if (!stat || !stat.isDirectory()) {
      return res.status(400).json({ error: `Input folder not found: ${inputDir}` });
    }
    await fs.mkdir(outputDir, { recursive: true });

    const entries = await fs.readdir(inputDir, { withFileTypes: true });
    const images = entries.filter((e) => e.isFile() && isSupported(e.name));

    const results = [];
    const usedNames = new Set();
    // Two sources with the same basename (e.g. logo.png and logo.jpg) would both
    // produce logo.webp — suffix with a counter instead of overwriting.
    function uniqueName(name) {
      let candidate = name;
      let i = 2;
      while (usedNames.has(candidate.toLowerCase())) {
        const ext = path.extname(name);
        candidate = `${path.basename(name, ext)}-${i}${ext}`;
        i++;
      }
      usedNames.add(candidate.toLowerCase());
      return candidate;
    }
    for (const entry of images) {
      const srcPath = path.join(inputDir, entry.name);
      try {
        const buffer = await fs.readFile(srcPath);
        const outputs = await convertBuffer(buffer, entry.name, { staticFrame });
        const written = [];
        for (const out of outputs) {
          out.name = uniqueName(out.name);
          const destPath = path.join(outputDir, out.name);
          await fs.writeFile(destPath, out.buffer);
          written.push({ name: out.name, size: out.buffer.length });
        }
        results.push({ original: entry.name, originalSize: buffer.length, files: written });
      } catch (err) {
        results.push({ original: entry.name, error: err.message });
      }
    }
    res.json({ total: images.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Image → WebP converter running at http://localhost:${PORT}`);
});
