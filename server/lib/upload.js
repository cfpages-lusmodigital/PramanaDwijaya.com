const fs = require('fs/promises');
const path = require('path');
const Jimp = require('jimp');
const { ROOT } = require('./paths');
const { slugify } = require('./utils');

const MAX_BYTES = 500 * 1024;
const MAX_WIDTH = 1600;
const UPLOAD_ROOT = path.join(ROOT, 'wp-content', 'uploads');

function uploadDir() {
  const now = new Date();
  return path.join(UPLOAD_ROOT, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
}

function filenameFrom(originalName) {
  const base = slugify(path.parse(originalName || 'gambar').name) || 'gambar';
  return `${base}-${Date.now().toString(36)}.jpg`;
}

function isLikelyImage(file) {
  const mime = String(file.mimetype || '').toLowerCase();
  const name = String(file.originalname || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|bmp|tiff?|heic|heif|avif)$/.test(name);
}

async function compressImage(buffer) {
  let image = await Jimp.read(buffer);
  if (image.bitmap.width > MAX_WIDTH) {
    image = image.resize(MAX_WIDTH, Jimp.AUTO);
  }

  let quality = 80;
  let width = image.bitmap.width;
  let output = await image.quality(quality).getBufferAsync(Jimp.MIME_JPEG);

  while (output.length > MAX_BYTES && quality > 40) {
    quality -= 8;
    output = await image.clone().quality(quality).getBufferAsync(Jimp.MIME_JPEG);
  }

  while (output.length > MAX_BYTES && width > 640) {
    width = Math.floor(width * 0.8);
    image = image.resize(width, Jimp.AUTO);
    output = await image.quality(Math.max(quality, 55)).getBufferAsync(Jimp.MIME_JPEG);
  }

  if (output.length > MAX_BYTES) {
    output = await image
      .resize(640, Jimp.AUTO)
      .quality(45)
      .getBufferAsync(Jimp.MIME_JPEG);
  }

  return output;
}

async function saveUploadedImage(file) {
  if (!file || !file.buffer) {
    throw new Error('Tidak ada file gambar yang diterima.');
  }

  if (!isLikelyImage(file)) {
    throw new Error('File harus berupa gambar (JPG, PNG, WEBP, atau GIF).');
  }

  let output;
  try {
    output = await compressImage(file.buffer);
  } catch (error) {
    throw new Error(`Gagal kompres gambar: ${error.message}`);
  }

  const dir = uploadDir();
  await fs.mkdir(dir, { recursive: true });
  const filename = filenameFrom(file.originalname);
  const absolutePath = path.join(dir, filename);
  await fs.writeFile(absolutePath, output);

  const url = `/${path.relative(ROOT, absolutePath).split(path.sep).join('/')}`;
  return { url, size: output.length, filename };
}

module.exports = {
  saveUploadedImage,
  MAX_BYTES,
};
