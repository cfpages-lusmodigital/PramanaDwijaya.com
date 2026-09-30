const fs = require('fs/promises');
const path = require('path');
const { readArticles, writeArticles } = require('./store');
const { rebuildListing } = require('./articles');
const { ROOT, site } = require('./paths');
const { slugify, stripHtml, truncate, toIsoDate } = require('./utils');

const BLOG_DIR = path.join(ROOT, site.listingSegment);
const BLOG_LISTING = path.join(BLOG_DIR, 'index.html');
const SKIP_PATH_PREFIXES = ['/blog/', '/category/', '/tag/', '/author/', '/produk/', '/page/'];

function normalizeHref(href) {
  if (!href || /^https?:\/\//i.test(href)) return '';
  const withoutQuery = href.split(/[?#]/)[0];
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
}

function extractListingHrefs(rawHtml) {
  const html = rawHtml.replace(/<!-- PB_ADMIN_ARTICLES_START -->[\s\S]*?<!-- PB_ADMIN_ARTICLES_END -->/, '');
  const hrefs = new Set();
  const titleLinkRe = /class="entry-title"[\s\S]*?<a\s+href="([^"]+)"/gi;
  let match = titleLinkRe.exec(html);
  while (match) {
    const href = normalizeHref(match[1]);
    if (href && !SKIP_PATH_PREFIXES.some((prefix) => href.startsWith(prefix))) {
      hrefs.add(href);
    }
    match = titleLinkRe.exec(html);
  }

  const rootHtmlRe = /href="\/([a-z0-9][a-z0-9-]*)\.html"/gi;
  match = rootHtmlRe.exec(html);
  while (match) {
    const slug = match[1];
    if (!['index', 'admin', 'blog'].includes(slug)) {
      hrefs.add(`/${slug}.html`);
    }
    match = rootHtmlRe.exec(html);
  }

  return [...hrefs];
}

function hrefToLegacyKey(href) {
  return href.replace(/^\//, '').replace(/\/$/, '');
}

function hrefToSlug(href) {
  if (href.endsWith('.html')) {
    return path.basename(href, '.html');
  }
  const segments = href.replace(/^\//, '').replace(/\/$/, '').split('/');
  const last = decodeURIComponent(segments[segments.length - 1] || '');
  const fromLast = slugify(last);
  if (fromLast) return fromLast;
  return slugify(segments.join('-')) || `legacy-${segments.join('-')}`;
}

function resolveArticleFile(href) {
  const key = hrefToLegacyKey(href);
  if (href.endsWith('.html')) {
    return path.join(ROOT, key);
  }
  return path.join(ROOT, key, 'index.html');
}

function extractTitle(html) {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  if (!match) return '';
  return match[1]
    .replace(/\s*[–|-]\s*Pramana Dwijaya.*$/i, '')
    .replace(/\s*[–|-]\s*PRAMANA Baja.*$/i, '')
    .trim();
}

function extractExcerpt(html) {
  const meta = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  if (meta?.[1]) return meta[1].trim();
  const contentMatch = html.match(/class="entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (!contentMatch) return '';
  return truncate(stripHtml(contentMatch[1]), 220);
}

const LEGACY_CONTENT_RE = /(class="entry-content[^"]*"[^>]*>)([\s\S]*?)(<\/div>\s*<footer class="entry-footer")/i;

function extractContent(html) {
  const legacy = html.match(LEGACY_CONTENT_RE);
  if (legacy) return legacy[2].trim();
  const match = html.match(/class="entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<!-- \.entry-content/i);
  if (match) return match[1].trim();
  const fallback = html.match(/class="entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  return fallback ? fallback[1].trim() : '';
}

function extractFeaturedImage(html) {
  const thumbBlock = html.match(/<div class="post-thumb-img-content post-thumb">[\s\S]*?<\/div>/i);
  if (thumbBlock) {
    const src = thumbBlock[0].match(/\ssrc="([^"]+)"/i);
    if (src?.[1]) return src[1];
  }

  const imgTag = html.match(/<img[^>]*wp-post-image[^>]*>/i);
  if (imgTag) {
    const src = imgTag[0].match(/\ssrc="([^"]+)"/i);
    if (src?.[1]) return src[1];
  }

  const entryImg = html.match(/class="entry-content[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i);
  if (entryImg?.[1] && !entryImg[1].startsWith('data:')) {
    return entryImg[1];
  }

  return '';
}

function extractPublishedDate(html) {
  const timeMatch = html.match(/<time[^>]+datetime="([^"]+)"/i);
  if (timeMatch?.[1]) return toIsoDate(timeMatch[1]);
  const match = html.match(/class="published"[^>]*>([^<]+)</i);
  if (match?.[1]) return toIsoDate(match[1]);
  const updatedMatch = html.match(/property="article:modified_time"\s+content="([^"]+)"/i);
  if (updatedMatch?.[1]) return toIsoDate(updatedMatch[1]);
  return toIsoDate();
}

function isArticleHtml(html) {
  return /type-post|single-post|hentry|entry-content/i.test(html);
}

async function importArticleFromHref(href) {
  const filePath = resolveArticleFile(href);
  let html;
  try {
    html = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }

  if (!isArticleHtml(html)) return null;

  const title = extractTitle(html);
  const content = extractContent(html);
  if (!title || !content) return null;

  const slug = hrefToSlug(href);
  const legacyKey = hrefToLegacyKey(href);

  return {
    id: `import-${legacyKey}`,
    slug,
    title,
    excerpt: extractExcerpt(html),
    content,
    featuredImage: extractFeaturedImage(html),
    category: site.defaultCategory,
    author: 'admin',
    publishedAt: extractPublishedDate(html),
    updatedAt: toIsoDate(),
    managed: false,
    source: 'imported',
    legacyHref: href,
  };
}

async function listListingFiles() {
  const files = [BLOG_LISTING];
  let pages = [];
  try {
    pages = await fs.readdir(path.join(BLOG_DIR, 'page'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  pages
    .filter((name) => /^\d+$/.test(name))
    .sort((a, b) => Number(a) - Number(b))
    .forEach((name) => files.push(path.join(BLOG_DIR, 'page', name, 'index.html')));
  return files;
}

async function collectListingHrefs() {
  const hrefs = new Set();
  for (const file of await listListingFiles()) {
    let html;
    try {
      html = await fs.readFile(file, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    extractListingHrefs(html).forEach((href) => hrefs.add(href));
  }
  return [...hrefs];
}

async function importLegacyArticles({ rebuild = true, resync = true } = {}) {
  const hrefs = await collectListingHrefs();
  const stored = await readArticles();
  const adminSlugs = new Set(stored.filter((item) => item.source !== 'imported').map((item) => item.slug));
  const existing = stored.filter((item) => !(item.source === 'imported' && adminSlugs.has(item.slug)));
  const droppedDuplicates = stored.length - existing.length;
  const existingKeys = new Set(
    existing.map((item) => item.legacyHref || item.slug).filter(Boolean)
  );
  adminSlugs.forEach((slug) => existingKeys.add(`/${slug}.html`));
  const imported = [];
  let resynced = 0;

  if (resync) {
    for (let index = 0; index < existing.length; index += 1) {
      const article = existing[index];
      if (article.source !== 'imported') continue;
      const href = article.legacyHref || `/${article.slug}.html`;
      const fresh = await importArticleFromHref(href);
      if (!fresh) continue;
      const next = { ...article };
      let changed = false;
      for (const field of ['title', 'content', 'excerpt', 'featuredImage']) {
        if (fresh[field] && fresh[field] !== article[field]) {
          next[field] = fresh[field];
          changed = true;
        }
      }
      if (changed) {
        existing[index] = next;
        resynced += 1;
      }
    }
  }
  if (resynced > 0 || droppedDuplicates > 0) {
    await writeArticles(existing);
  }

  for (const href of hrefs) {
    const key = hrefToLegacyKey(href);
    if (existingKeys.has(href) || existingKeys.has(key)) continue;
    const article = await importArticleFromHref(href);
    if (!article) continue;
    imported.push(article);
    existingKeys.add(href);
    existingKeys.add(key);
  }

  if (imported.length > 0) {
    await writeArticles([...existing, ...imported]);
  }

  if (rebuild && (imported.length > 0 || resynced > 0)) {
    await rebuildListing();
  }

  if (imported.length === 0 && resynced === 0) {
    return { imported: 0, resynced: 0, total: existing.length, slugs: [] };
  }

  return {
    imported: imported.length,
    resynced,
    total: existing.length + imported.length,
    slugs: imported.map((item) => item.slug),
  };
}

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function patchLegacyArticleHtml(html, { title, excerpt, content }) {
  if (!LEGACY_CONTENT_RE.test(html)) {
    throw new Error('Struktur HTML artikel lama tidak dikenali, perubahan tidak disimpan.');
  }
  const pageTitle = escapeAttr(`${title} - ${site.siteLabel}`);
  let next = html.replace(LEGACY_CONTENT_RE, (_, open, _old, close) => `${open}\n${content}\n${close}`);
  next = next.replace(/<title>[^<]*<\/title>/i, () => `<title>${pageTitle}</title>`);
  next = next.replace(/(<meta property="og:title" content=")[^"]*(")/i, (_, a, b) => `${a}${pageTitle}${b}`);
  next = next.replace(
    /(<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>)[\s\S]*?(<\/h1>)/i,
    (_, a, b) => `${a}${escapeAttr(title)}${b}`
  );
  if (excerpt) {
    next = next.replace(/(<meta name="description" content=")[^"]*(")/i, (_, a, b) => `${a}${escapeAttr(excerpt)}${b}`);
    next = next.replace(/(<meta property="og:description" content=")[^"]*(")/i, (_, a, b) => `${a}${escapeAttr(excerpt)}${b}`);
  }
  return next;
}

async function updateLegacyArticleFile(href, fields) {
  const filePath = resolveArticleFile(href);
  const html = await fs.readFile(filePath, 'utf8');
  await fs.writeFile(filePath, patchLegacyArticleHtml(html, fields), 'utf8');
}

module.exports = {
  importLegacyArticles,
  importArticleFromHref,
  extractListingHrefs,
  updateLegacyArticleFile,
};
