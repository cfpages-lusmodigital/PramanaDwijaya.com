const { truncate, stripHtml, toIsoDate } = require('./utils');

function extractTitle(html) {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  if (!match) return '';
  return match[1].replace(/\s*[–-]\s*PRAMANA Baja.*$/i, '').trim();
}

function extractExcerpt(html) {
  const meta = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  if (meta?.[1]) return meta[1].trim();
  const contentMatch = html.match(/class="entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (!contentMatch) return '';
  return truncate(stripHtml(contentMatch[1]), 220);
}

function extractContent(html) {
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

  return '';
}

function extractPublishedDate(html) {
  const match = html.match(/class="published"[^>]*>([^<]+)</i);
  if (match?.[1]) return toIsoDate(match[1]);
  const updatedMatch = html.match(/property="article:modified_time"\s+content="([^"]+)"/i);
  if (updatedMatch?.[1]) return toIsoDate(updatedMatch[1]);
  return toIsoDate();
}

function patchArticleHtml(html, article) {
  let next = html;

  const pageTitle = `${article.title} – PRAMANA Baja`;
  next = next.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);

  if (article.excerpt) {
    if (/<meta\s+name="description"/i.test(next)) {
      next = next.replace(
        /<meta\s+name="description"\s+content="[^"]*"/i,
        `<meta name="description" content="${escapeHtml(article.excerpt)}"`
      );
    }
  }

  next = next.replace(
    /(<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>)([\s\S]*?)(<\/h1>)/i,
    `$1${escapeHtml(article.title)}$3`
  );

  next = next.replace(
    /(class="entry-content[^"]*"[^>]*>)([\s\S]*?)(<\/div>\s*<!-- \.entry-content)/i,
    `$1${article.content}$3`
  );

  if (article.featuredImage) {
    const thumbPattern = /<div class="post-thumb-img-content post-thumb">[\s\S]*?<\/div>/i;
    const imgBlock = `<div class="post-thumb-img-content post-thumb"><img width="768" height="768" src="${escapeHtml(article.featuredImage)}" class="attachment-large size-large wp-post-image" alt="${escapeHtml(article.title)}" loading="lazy" decoding="async"></div>`;
    if (thumbPattern.test(next)) {
      next = next.replace(thumbPattern, imgBlock);
    } else {
      next = next.replace(
        /(<h1[^>]*class="[^"]*entry-title)/i,
        `${imgBlock}$1`
      );
    }
  }

  return next;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  extractTitle,
  extractExcerpt,
  extractContent,
  extractFeaturedImage,
  extractPublishedDate,
  patchArticleHtml,
};
