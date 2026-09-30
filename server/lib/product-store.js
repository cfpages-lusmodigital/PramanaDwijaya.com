const fs = require('fs/promises');
const path = require('path');
const { DATA_DIR } = require('./paths');

const PRODUCT_ARTICLES_FILE = path.join(DATA_DIR, 'product-articles.json');

async function ensureDataFile() {
  try {
    await fs.access(PRODUCT_ARTICLES_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      PRODUCT_ARTICLES_FILE,
      `${JSON.stringify({ lastSyncedAt: null, articles: [] }, null, 2)}\n`
    );
  }
}

async function readProductIndex() {
  await ensureDataFile();
  const raw = await fs.readFile(PRODUCT_ARTICLES_FILE, 'utf8');
  const data = JSON.parse(raw);
  return {
    lastSyncedAt: data.lastSyncedAt || null,
    articles: Array.isArray(data.articles) ? data.articles : [],
  };
}

async function writeProductIndex({ lastSyncedAt, articles }) {
  await ensureDataFile();
  const payload = {
    lastSyncedAt: lastSyncedAt || null,
    articles: [...articles].sort((a, b) => a.title.localeCompare(b.title, 'id')),
  };
  await fs.writeFile(PRODUCT_ARTICLES_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

module.exports = {
  PRODUCT_ARTICLES_FILE,
  readProductIndex,
  writeProductIndex,
};
