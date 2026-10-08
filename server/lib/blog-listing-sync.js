const fs = require('fs/promises');
const { LISTING_PAGE_FILE, site } = require('./paths');
const { escapeHtml } = require('./utils');
const { publishAttr, ensureScheduleScript, ensureArticleSchedule } = require('./static-schedule');
const { isPublished } = require('./publish');

const START_MARKER = '<!-- PB_ADMIN_ARTICLES_START -->';
const END_MARKER = '<!-- PB_ADMIN_ARTICLES_END -->';
const SCRIPT_MARKER = '<!-- PB_ADMIN_ARTICLES_SCRIPT -->';

function isAdminArticle(article) {
  return article && article.source !== 'imported' && article.slug && article.title;
}

function generateBlogListItem(article) {
  const href = `/${article.slug}.html`;
  const title = escapeHtml(article.title);
  const excerpt = escapeHtml(article.excerpt || '');
  const slug = escapeHtml(article.slug);
  const imageSrc = article.featuredImage
    ? escapeHtml(article.featuredImage)
    : escapeHtml(site.defaultFeaturedImage);

  return `
<article id="post-pb-${slug}" class="post type-post status-publish format-standard hentry pb-admin-article" data-pb-admin="true"${publishAttr(article)}>
\t<header class="entry-header">
\t\t<h2 class="entry-title"><a href="${href}" rel="bookmark">${title}</a></h2>
\t</header>
\t<div class="entry-summary">
\t\t<p>${excerpt}</p>
\t\t<p><a href="${href}">Baca selengkapnya &rarr;</a></p>
\t</div>
\t<div class="pb-admin-thumb" hidden aria-hidden="true"><img src="${imageSrc}" alt=""></div>
</article>`;
}

function replaceBetween(html, start, end, inner) {
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return null;
  }
  return html.slice(0, startIndex) + `${start}\n${inner}\n${end}` + html.slice(endIndex + end.length);
}

function insertMarkers(html) {
  if (html.includes(START_MARKER) && html.includes(END_MARKER)) {
    return html;
  }

  const needles = [
    '<main id="main" class="site-main">',
    '<main id="main"',
    '<div id="content" role="main">',
    '<div id="content"',
    'class="rt-row rt-content-loader',
    'list-layout-wrapper"',
  ];

  for (const needle of needles) {
    const at = html.indexOf(needle);
    if (at === -1) continue;
    const close = html.indexOf('>', at);
    if (close === -1) continue;
    return `${html.slice(0, close + 1)}\n${START_MARKER}\n${END_MARKER}${html.slice(close + 1)}`;
  }

  throw new Error(`Struktur halaman ${site.listingPublicPath} tidak dikenali. Salin blog/index.html dari export statis .com lalu jalankan ulang.`);
}

function ensureInjectScript(html) {
  if (html.includes(SCRIPT_MARKER)) return html;
  const script = `${SCRIPT_MARKER}\n<script src="${site.injectScript}" defer></script>\n`;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${script}</body>`);
  }
  return html + script;
}

async function syncBlogListingPage(articles) {
  const adminArticles = (Array.isArray(articles) ? articles : []).filter(
    (article) => isAdminArticle(article) && isPublished(article)
  );
  const inner = adminArticles.map((article) => generateBlogListItem(article)).join('\n');

  let html;
  try {
    html = await fs.readFile(LISTING_PAGE_FILE, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        `File ${site.listingPublicPath}index.html belum ada. Export halaman Blog dari WordPress/static site ke folder blog/ di repo ini.`
      );
    }
    throw error;
  }

  html = insertMarkers(html);

  const replaced = replaceBetween(html, START_MARKER, END_MARKER, inner);
  if (!replaced) {
    throw new Error(`Gagal menulis blok artikel admin di ${site.listingPublicPath}`);
  }

  html = ensureInjectScript(replaced);
  await fs.writeFile(LISTING_PAGE_FILE, html, 'utf8');
  await ensureScheduleScript(LISTING_PAGE_FILE);
  for (const article of adminArticles) {
    await ensureArticleSchedule(article.slug, article.publishedAt);
  }
}

module.exports = {
  syncBlogListingPage,
  generateBlogListItem,
  isAdminArticle,
  START_MARKER,
  END_MARKER,
};
