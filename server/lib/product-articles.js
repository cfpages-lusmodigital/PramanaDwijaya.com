const fs = require('fs/promises');
const { readProductIndex, writeProductIndex } = require('./product-store');
const { getProductGroups, getCategoryById } = require('./product-categories');
const { articleHtmlPath } = require('./paths');
const { generateArticleHtml } = require('./generator');
const { slugify, truncate, stripHtml, toIsoDate } = require('./utils');
const {
  extractTitle,
  extractExcerpt,
  extractContent,
  extractFeaturedImage,
  patchArticleHtml,
} = require('./html-article');
const { notifyPublishScheduleChanged } = require('./schedule');

function buildCategoryCounts(articles) {
  const counts = {};
  for (const article of articles) {
    counts[article.categoryId] = (counts[article.categoryId] || 0) + 1;
  }
  return counts;
}

function countUniqueSlugs(articles) {
  return new Set(articles.map((item) => item.slug)).size;
}

function getCategoriesWithCounts(articles) {
  const counts = buildCategoryCounts(articles);
  return getProductGroups().map((group) => ({
    ...group,
    total: group.categories.reduce((sum, cat) => sum + (counts[cat.id] || 0), 0),
    categories: group.categories.map((cat) => ({
      ...cat,
      count: counts[cat.id] || 0,
    })),
  }));
}

function filterArticles(articles, { categoryId, groupId, q } = {}) {
  let rows = articles;
  if (groupId) {
    rows = rows.filter((item) => item.groupId === groupId);
  }
  if (categoryId) {
    rows = rows.filter((item) => item.categoryId === categoryId);
  }
  if (q) {
    const query = q.trim().toLowerCase();
    if (query) {
      rows = rows.filter(
        (item) => item.title.toLowerCase().includes(query) || item.slug.toLowerCase().includes(query)
      );
    }
  }
  return rows;
}

async function listProductArticles(options = {}) {
  const { articles, lastSyncedAt } = await readProductIndex();
  const filtered = filterArticles(articles, options);
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 50));
  const start = (page - 1) * limit;
  const slice = filtered.slice(start, start + limit);

  return {
    articles: slice,
    pagination: {
      page,
      limit,
      total: filtered.length,
      pages: Math.max(1, Math.ceil(filtered.length / limit)),
    },
    total: countUniqueSlugs(articles),
    listed: articles.length,
    lastSyncedAt,
    groups: getCategoriesWithCounts(articles),
  };
}

async function getProductArticle(slug) {
  const { articles } = await readProductIndex();
  const meta = articles.find((item) => item.slug === slug);
  if (!meta) return null;

  let html;
  try {
    html = await fs.readFile(articleHtmlPath(slug), 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { ...meta, content: '', excerpt: meta.excerpt || '' };
  }

  return {
    ...meta,
    title: extractTitle(html) || meta.title,
    excerpt: extractExcerpt(html) || meta.excerpt,
    content: extractContent(html),
    featuredImage: extractFeaturedImage(html) || meta.featuredImage,
    category: meta.categoryLabel,
    author: 'admin',
    publishedAt: meta.publishedAt || meta.updatedAt,
  };
}

async function updateProductArticle(slug, input) {
  const index = await readProductIndex();
  const matches = index.articles.filter((item) => item.slug === slug);
  if (matches.length === 0) {
    throw new Error('Artikel produk tidak ditemukan.');
  }

  const existing = matches[0];
  const title = String(input.title || existing.title || '').trim();
  const content = String(input.content || '').trim();
  if (!title) throw new Error('Judul artikel wajib diisi.');
  if (!content) throw new Error('Konten artikel wajib diisi.');

  const excerpt = truncate(String(input.excerpt || stripHtml(content)).trim(), 220);
  const featuredImage = String(input.featuredImage ?? existing.featuredImage ?? '').trim();
  let categoryMeta = getCategoryById(existing.categoryId);
  if (input.categoryId && input.categoryId !== existing.categoryId) {
    categoryMeta = getCategoryById(input.categoryId);
    if (!categoryMeta) throw new Error('Kategori produk tidak valid.');
  }
  const now = toIsoDate();
  const publishedAt = toIsoDate(input.publishedAt || existing.publishedAt || now);

  let html;
  try {
    html = await fs.readFile(articleHtmlPath(slug), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('File HTML artikel tidak ditemukan.');
    throw error;
  }

  const patched = patchArticleHtml(html, {
    title,
    excerpt,
    content,
    featuredImage,
    categoryLabel: categoryMeta?.label || existing.categoryLabel,
  });
  await fs.writeFile(articleHtmlPath(slug), patched, 'utf8');

  const patchFields = {
    title,
    excerpt,
    featuredImage,
    categoryId: categoryMeta.id,
    categoryLabel: categoryMeta.label,
    groupId: categoryMeta.groupId,
    groupLabel: categoryMeta.groupLabel,
    listingPath: `/${categoryMeta.listingDir}/`,
    updatedAt: now,
    publishedAt,
  };
  index.articles = index.articles.map((item) => (
    item.slug === slug ? { ...item, ...patchFields } : item
  ));
  await writeProductIndex(index);
  await notifyPublishScheduleChanged();

  return {
    ...existing,
    ...patchFields,
    content,
    category: categoryMeta.label,
    author: 'admin',
  };
}

async function createProductArticle(input) {
  const title = String(input.title || '').trim();
  const slug = slugify(input.slug || title);
  const content = String(input.content || '').trim();
  const categoryId = String(input.categoryId || '').trim();

  if (!title) throw new Error('Judul artikel wajib diisi.');
  if (!slug) throw new Error('Slug artikel tidak valid.');
  if (!content) throw new Error('Konten artikel wajib diisi.');
  if (!categoryId) throw new Error('Kategori produk wajib dipilih.');

  const categoryMeta = getCategoryById(categoryId);
  if (!categoryMeta) throw new Error('Kategori produk tidak valid.');

  const index = await readProductIndex();
  if (index.articles.some((item) => item.slug === slug)) {
    throw new Error(`Artikel dengan slug "${slug}" sudah ada.`);
  }

  try {
    await fs.access(articleHtmlPath(slug));
    throw new Error(`File /${slug}.html sudah ada.`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const now = toIsoDate();
  const excerpt = truncate(String(input.excerpt || stripHtml(content)).trim(), 220);
  const featuredImage = String(input.featuredImage || '').trim();
  const publishedAt = toIsoDate(input.publishedAt || now);

  const html = generateArticleHtml({
    title,
    slug,
    excerpt,
    content,
    featuredImage,
    category: categoryMeta.label,
    author: 'admin',
    publishedAt,
    updatedAt: now,
  });
  await fs.writeFile(articleHtmlPath(slug), html, 'utf8');

  const record = {
    slug,
    title,
    excerpt,
    featuredImage,
    categoryId: categoryMeta.id,
    categoryLabel: categoryMeta.label,
    groupId: categoryMeta.groupId,
    groupLabel: categoryMeta.groupLabel,
    listingPath: `/${categoryMeta.listingDir}/`,
    source: 'admin',
    updatedAt: now,
    publishedAt,
  };
  index.articles.push(record);
  await writeProductIndex(index);
  await notifyPublishScheduleChanged();

  return {
    ...record,
    content,
    category: categoryMeta.label,
    author: 'admin',
    publishedAt,
  };
}

async function deleteProductArticle(slug) {
  const index = await readProductIndex();
  const matches = index.articles.filter((item) => item.slug === slug);
  if (matches.length === 0) {
    throw new Error('Artikel produk tidak ditemukan.');
  }

  try {
    await fs.unlink(articleHtmlPath(slug));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  index.articles = index.articles.filter((item) => item.slug !== slug);
  await writeProductIndex(index);
  await notifyPublishScheduleChanged();

  return { slug, removed: matches.length };
}

module.exports = {
  listProductArticles,
  getProductArticle,
  createProductArticle,
  updateProductArticle,
  deleteProductArticle,
  getCategoriesWithCounts,
};
