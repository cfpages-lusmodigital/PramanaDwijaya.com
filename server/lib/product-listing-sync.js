const fs = require('fs/promises');
const path = require('path');
const { ROOT } = require('./paths');
const { escapeHtml } = require('./utils');
const { getAllCategories } = require('./product-categories');
const { publishAttr, ensureScheduleScript, ensureArticleSchedule } = require('./static-schedule');

const START_MARKER = '<!-- PD_CAT_ARTICLES_START -->';
const END_MARKER = '<!-- PD_CAT_ARTICLES_END -->';
const STYLE_ID = 'pd-cat-articles-css';
const DEFAULT_THUMB = '/wp-content/uploads/2016/05/atap-baja-ringan.jpg';

const STYLE = `<style id="${STYLE_ID}">
.pd-cat-articles{margin:2.2rem 0 1rem;padding-top:1.4rem;border-top:1px solid #dcdcde;font-family:Montserrat,Helvetica,Arial,sans-serif}
.pd-cat-articles h2{margin:0 0 14px;font-size:1.15rem;line-height:1.3;color:#1a1a1a}
.pd-cat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.pd-cat-card{display:flex;flex-direction:column;background:#fff;border:1px solid #dcdcde;text-decoration:none;color:#1a1a1a;min-height:100%}
.pd-cat-card:hover{border-color:#0073aa}
.pd-cat-card img{display:block;width:100%;height:148px;object-fit:cover;background:#f3f4f5}
.pd-cat-card__body{padding:14px 14px 16px}
.pd-cat-kicker{display:block;margin:0 0 6px;color:#0073aa;font-size:12px;font-weight:700}
.pd-cat-card strong{display:block;font-size:16px;line-height:1.35;font-weight:700}
.pd-cat-card p{margin:8px 0 0;color:#555;font-size:13px;line-height:1.5;font-weight:400}
.pd-cat-empty{margin:0;padding:18px;border:1px solid #dcdcde;background:#fff;color:#666;font-size:14px}
@media (max-width:640px){.pd-cat-grid{grid-template-columns:1fr}}
</style>`;

function generateProductCard(article, category) {
  const href = `/${article.slug}.html`;
  const title = escapeHtml(article.title);
  const excerpt = escapeHtml(article.excerpt || '');
  const imageSrc = escapeHtml(article.featuredImage || DEFAULT_THUMB);
  const kicker = escapeHtml(category.groupLabel);

  return `<a class="pd-cat-card" href="${href}" data-pb-admin="true"${publishAttr(article)}>
  <img src="${imageSrc}" alt="${title}" loading="lazy">
  <div class="pd-cat-card__body">
    <span class="pd-cat-kicker">${kicker}</span>
    <strong>${title}</strong>
    ${excerpt ? `<p>${excerpt}</p>` : ''}
  </div>
</a>`;
}

function sectionHtml(category, cards) {
  const heading = escapeHtml(category.label);
  const body = cards.length
    ? `<div class="pd-cat-grid">\n${cards.join('\n')}\n</div>`
    : '<p class="pd-cat-empty">Belum ada artikel untuk kategori ini.</p>';
  return `<section class="pd-cat-articles" aria-label="Artikel ${heading}">
  <h2>Artikel ${heading}</h2>
  ${body}
</section>`;
}

function replaceBetween(html, inner) {
  const startIndex = html.indexOf(START_MARKER);
  const endIndex = html.indexOf(END_MARKER);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return null;
  return `${html.slice(0, startIndex)}${START_MARKER}\n${inner}\n${END_MARKER}${html.slice(endIndex + END_MARKER.length)}`;
}

function insertMarkers(html) {
  if (html.includes(START_MARKER) && html.includes(END_MARKER)) return html;
  const needle = '</div></article></main>';
  const at = html.indexOf(needle);
  if (at === -1) return null;
  return `${html.slice(0, at)}${START_MARKER}\n${END_MARKER}\n${html.slice(at)}`;
}

function ensureStyle(html) {
  if (html.includes(`id="${STYLE_ID}"`)) return html;
  if (html.includes('</head>')) return html.replace('</head>', `${STYLE}\n</head>`);
  return `${STYLE}\n${html}`;
}

async function syncProductListings(articles) {
  const adminArticles = (Array.isArray(articles) ? articles : []).filter(
    (article) => article && article.source === 'admin' && article.slug && article.title
  );

  for (const category of getAllCategories()) {
    const file = path.join(ROOT, category.listingDir, 'index.html');
    let html;
    try {
      html = await fs.readFile(file, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }

    const cards = adminArticles
      .filter((article) => article.categoryId === category.id)
      .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
      .map((article) => generateProductCard(article, category));

    html = ensureStyle(html);
    html = insertMarkers(html);
    if (!html) continue;
    const replaced = replaceBetween(html, sectionHtml(category, cards));
    if (!replaced) continue;
    await fs.writeFile(file, replaced, 'utf8');
    if (cards.length) await ensureScheduleScript(file);
  }

  for (const article of adminArticles) {
    await ensureArticleSchedule(article.slug, article.publishedAt);
  }
}

module.exports = {
  syncProductListings,
};
