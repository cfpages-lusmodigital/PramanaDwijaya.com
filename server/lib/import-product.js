const fs = require('fs/promises');
const path = require('path');
const { ROOT } = require('./paths');
const { getAllCategories } = require('./product-categories');
const { writeProductIndex, readProductIndex } = require('./product-store');
const { extractTitle, extractFeaturedImage } = require('./html-article');
const { toIsoDate } = require('./utils');
const { notifyPublishScheduleChanged } = require('./schedule');

function extractArticlesFromListing(html) {
  const seen = new Set();
  const articles = [];
  const cardRe = /href="\/(jual-[a-z0-9-]+)\.html"[^>]*class="tpg-post-link"[\s\S]*?class="entry-title"[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi;
  let match = cardRe.exec(html);

  while (match) {
    const slug = match[1];
    if (seen.has(slug)) {
      match = cardRe.exec(html);
      continue;
    }
    seen.add(slug);

    const blockStart = match.index;
    const block = html.slice(blockStart, blockStart + 2500);
    const imgMatch = block.match(/<img[^>]*class="[^"]*rt-img-responsive[^"]*"[^>]*>/i)
      || block.match(/<img[^>]*>/i);
    let featuredImage = '';
    if (imgMatch) {
      const src = imgMatch[0].match(/\ssrc="([^"]+)"/i);
      if (src?.[1]) featuredImage = src[1];
    }

    articles.push({
      slug,
      title: match[2].trim(),
      excerpt: match[2].trim(),
      featuredImage,
    });
    match = cardRe.exec(html);
  }

  return articles;
}

function buildArticleRecord(slug, categoryMeta, meta = {}) {
  const title = meta.title || slug.replace(/^jual-/, '').replace(/-/g, ' ');
  const now = toIsoDate();
  return {
    slug,
    title,
    excerpt: meta.excerpt || title,
    featuredImage: meta.featuredImage || '',
    categoryId: categoryMeta.id,
    categoryLabel: categoryMeta.label,
    groupId: categoryMeta.groupId,
    groupLabel: categoryMeta.groupLabel,
    listingPath: `/${categoryMeta.listingDir}/`,
    source: 'product',
    updatedAt: now,
    publishedAt: meta.publishedAt || now,
  };
}

async function enrichFromHtml(slug, meta) {
  if (meta.title && meta.featuredImage) return meta;
  try {
    const html = await fs.readFile(path.join(ROOT, `${slug}.html`), 'utf8');
    return {
      title: meta.title || extractTitle(html),
      excerpt: meta.excerpt || extractTitle(html),
      featuredImage: meta.featuredImage || extractFeaturedImage(html),
    };
  } catch {
    return meta;
  }
}

function listingSlugMatchesCategory(slug, category) {
  if (category.id === 'atap-galvalum') {
    if (slug.startsWith('jual-atap-seng-')) return false;
    return slug.startsWith('jual-atap-galvalum-');
  }
  return true;
}

async function discoverSlugsFromPrefix(category) {
  if (!category.slugPrefix) return [];
  const entries = await fs.readdir(ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.startsWith(category.slugPrefix) && entry.name.endsWith('.html'))
    .map((entry) => entry.name.replace(/\.html$/, ''));
}

async function importProductArticles() {
  const articles = [];
  const seenKeys = new Set();
  let scanned = 0;
  const publishedAtBySlug = new Map();

  try {
    const existing = await readProductIndex();
    for (const item of existing.articles) {
      if (item.publishedAt && !publishedAtBySlug.has(item.slug)) {
        publishedAtBySlug.set(item.slug, item.publishedAt);
      }
    }
  } catch {
    /* first import */
  }

  for (const category of getAllCategories()) {
    const listingPath = path.join(ROOT, category.listingDir, 'index.html');
    let html;
    try {
      html = await fs.readFile(listingPath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }

    const found = extractArticlesFromListing(html).filter((item) => listingSlugMatchesCategory(item.slug, category));
    scanned += found.length;

    const slugSet = new Set(found.map((item) => item.slug));
    if (category.id === 'atap-galvalum' && category.slugPrefix) {
      const fromDisk = await discoverSlugsFromPrefix(category);
      for (const slug of fromDisk) {
        if (slugSet.has(slug)) continue;
        slugSet.add(slug);
        found.push({ slug, title: '', excerpt: '', featuredImage: '' });
      }
    }

    for (const item of found) {
      if (!listingSlugMatchesCategory(item.slug, category)) continue;

      const key = `${category.id}:${item.slug}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      let meta = item;
      if (!meta.title || !meta.featuredImage) {
        meta = await enrichFromHtml(item.slug, meta);
      }

      articles.push(buildArticleRecord(item.slug, category, {
        ...meta,
        publishedAt: publishedAtBySlug.get(item.slug),
      }));
    }
  }

  const uniqueSlugs = new Set(articles.map((item) => item.slug)).size;
  const now = toIsoDate();
  await writeProductIndex({ lastSyncedAt: now, articles });
  await notifyPublishScheduleChanged();

  return {
    ok: true,
    imported: articles.length,
    uniqueSlugs,
    scanned,
    lastSyncedAt: now,
  };
}

module.exports = {
  extractArticlesFromListing,
  listingSlugMatchesCategory,
  importProductArticles,
};
