const fs = require('fs/promises');
const path = require('path');
const { ARTICLES_FILE } = require('./paths');

async function ensureDataFile() {
  try {
    await fs.access(ARTICLES_FILE);
  } catch {
    await fs.mkdir(path.dirname(ARTICLES_FILE), { recursive: true });
    await fs.writeFile(ARTICLES_FILE, JSON.stringify({ articles: [] }, null, 2));
  }
}

async function readArticles() {
  await ensureDataFile();
  const raw = await fs.readFile(ARTICLES_FILE, 'utf8');
  const data = JSON.parse(raw);
  return Array.isArray(data.articles) ? data.articles : [];
}

async function writeArticles(articles) {
  await ensureDataFile();
  const sorted = [...articles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  await fs.writeFile(
    ARTICLES_FILE,
    `${JSON.stringify({ articles: sorted }, null, 2)}\n`
  );
  return sorted;
}

module.exports = {
  readArticles,
  writeArticles,
};
