const fs = require('fs');
const path = require('path');
const { TEMPLATES_DIR, site } = require('./paths');
const { escapeHtml, formatDate } = require('./utils');

function loadTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, name), 'utf8');
}

function renderTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '');
}

function buildFeaturedImageBlock(article) {
  if (!article.featuredImage) return '';
  const src = escapeHtml(article.featuredImage);
  const alt = escapeHtml(article.title);
  return `<div class="post-thumb-img-content post-thumb"><img width="768" height="768" src="${src}" class="attachment-large size-large wp-post-image" alt="${alt}" loading="lazy" decoding="async"></div>`;
}

function generateArticleHtml(article) {
  const template = loadTemplate('article.html');
  const pageTitle = `${article.title} – ${site.siteLabel}`;
  const canonical = `/${article.slug}.html`;

  return renderTemplate(template, {
    title: escapeHtml(pageTitle),
    metaDescription: escapeHtml(article.excerpt),
    canonical,
    slug: escapeHtml(article.slug),
    articleTitle: escapeHtml(article.title),
    category: escapeHtml(article.category),
    hasThumbnail: article.featuredImage ? 'has-post-thumbnail' : '',
    author: escapeHtml(article.author),
    publishedDate: escapeHtml(formatDate(article.publishedAt)),
    featuredImageBlock: buildFeaturedImageBlock(article),
    content: article.content,
    updatedAt: escapeHtml(formatDate(article.updatedAt)),
    publishMeta: article.publishedAt
      ? `<meta name="pb-publish" content="${escapeHtml(article.publishedAt)}">\n<script src="/admin/publish-schedule.js" defer></script>`
      : '',
  });
}

function generateListingHtml(articles) {
  const template = loadTemplate('listing.html');
  const cards = articles
    .map((article) => {
      const href = `/${article.slug}.html`;
      const image = article.featuredImage
        ? `<img loading="lazy" decoding="async" src="${escapeHtml(article.featuredImage)}" alt="${escapeHtml(article.title)}" width="768" height="768">`
        : '';
      return `
        <article class="managed-card" data-pb-publish="${escapeHtml(article.publishedAt || '')}">
          <a href="${href}" class="managed-card__image">${image}</a>
          <div class="managed-card__body">
            <p class="managed-card__meta">${escapeHtml(formatDate(article.publishedAt))}</p>
            <h2><a href="${href}">${escapeHtml(article.title)}</a></h2>
            <p>${escapeHtml(article.excerpt)}</p>
          </div>
        </article>
      `;
    })
    .join('\n');

  const emptyState =
    articles.length === 0
      ? '<p class="managed-empty">Belum ada artikel yang dikelola via admin.</p>'
      : '';

  return renderTemplate(template, {
    articleCount: String(articles.length),
    articleCards: cards || emptyState,
    generatedAt: escapeHtml(formatDate(new Date())),
  });
}

module.exports = {
  generateArticleHtml,
  generateListingHtml,
};
