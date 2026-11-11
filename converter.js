const sharp = require("sharp");
const path = require("path");

// Quality tuned for "visually same, less weight":
// quality 90 + max effort + smartSubsample keeps images visually identical
// while compressing as hard as WebP allows.
const WEBP_OPTS = { quality: 90, effort: 6, smartSubsample: true };
// effort 4 (libwebp default) for animations: effort 6 is paid per frame and
// is ~25x slower for ~3% smaller output.
const ANIMATED_WEBP_OPTS = { quality: 90, effort: 4 };

const SUPPORTED_EXT = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tif", ".tiff",
  ".avif", ".heif", ".heic", ".svg", ".webp", ".jp2", ".jxl",
]);

function isSupported(filename) {
  return SUPPORTED_EXT.has(path.extname(filename).toLowerCase());
}

function isGif(filename) {
  return path.extname(filename).toLowerCase() === ".gif";
}

const WEBP_MAX_DIM = 16383; // hard limit of the WebP format, per side

async function fitToWebp(img) {
  const meta = await img.metadata();
  const width = meta.width || 0;
  // For animated inputs, metadata height is the full frame stack; pageHeight is one frame.
  const height = meta.pageHeight || meta.height || 0;
  if (width > WEBP_MAX_DIM || height > WEBP_MAX_DIM) {
    img = img.resize({
      width: WEBP_MAX_DIM,
      height: WEBP_MAX_DIM,
      fit: "inside",
      withoutEnlargement: true,
    });
  }
  return img;
}

/**
 * Convert one image buffer to WebP.
 * Returns an array of outputs: [{ name, buffer }]
 * GIFs return two outputs: animated + static.
 * opts.staticFrame (1-based) picks which GIF frame becomes the static WebP;
 * values past the last frame are clamped to the last frame. Default: 1.
 */
async function convertBuffer(buffer, originalName, opts = {}) {
  const base = path.basename(originalName, path.extname(originalName));

  // limitInputPixels: false lifts sharp's ~268MP safety cap — needed for very
  // large images and long GIFs (all frames count toward the pixel total).
  // The WebP format itself cannot exceed 16383px per side, so anything larger
  // is downscaled to fit while keeping its aspect ratio.
  if (isGif(originalName)) {
    const meta = await sharp(buffer, { animated: true, limitInputPixels: false }).metadata();
    const pages = meta.pages || 1;
    const requested = parseInt(opts.staticFrame, 10) || 1;
    const page = Math.min(Math.max(requested, 1), pages) - 1;

    const [animated, staticFrame] = await Promise.all([
      fitToWebp(sharp(buffer, { animated: true, limitInputPixels: false })).then((s) =>
        s.webp(ANIMATED_WEBP_OPTS).toBuffer()
      ),
      fitToWebp(sharp(buffer, { page, limitInputPixels: false })).then((s) =>
        s.webp(WEBP_OPTS).toBuffer()
      ),
    ]);
    return [
      { name: `${base}.webp`, buffer: animated },
      { name: `${base}-static.webp`, buffer: staticFrame },
    ];
  }

  const img = await fitToWebp(sharp(buffer, { limitInputPixels: false }));
  const out = await img.webp(WEBP_OPTS).toBuffer();
  return [{ name: `${base}.webp`, buffer: out }];
}

module.exports = { convertBuffer, isSupported, isGif };
