const fs = require('fs/promises');
const path = require('path');
const { ROOT } = require('./paths');
const { escapeHtml } = require('./utils');

const SCRIPT_TAG = '<script src="/admin/publish-schedule.js" defer></script>';

function publishAttr(article) {
  if (!article?.publishedAt) return '';
  return ` data-pb-publish="${escapeHtml(article.publishedAt)}"`;
}

async function ensureScheduleScript(filePath) {
  let html = await fs.readFile(filePath, 'utf8');
  if (html.includes('/admin/publish-schedule.js')) return;
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${SCRIPT_TAG}\n</body>`);
  } else {
    html += `\n${SCRIPT_TAG}\n`;
  }
  await fs.writeFile(filePath, html, 'utf8');
}

async function ensureArticleSchedule(slug, publishedAt) {
  if (!slug || !publishedAt) return;
  const file = path.join(ROOT, `${slug}.html`);
  let html;
  try {
    html = await fs.readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  const meta = `<meta name="pb-publish" content="${escapeHtml(publishedAt)}">`;
  if (html.includes('name="pb-publish"')) {
    html = html.replace(/<meta name="pb-publish" content="[^"]*">/, meta);
  } else if (html.includes('</head>')) {
    html = html.replace('</head>', `${meta}\n</head>`);
  }

  if (!html.includes('/admin/publish-schedule.js')) {
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${SCRIPT_TAG}\n</body>`);
    } else {
      html += `\n${SCRIPT_TAG}\n`;
    }
  }

  await fs.writeFile(file, html, 'utf8');
}

module.exports = {
  publishAttr,
  ensureScheduleScript,
  ensureArticleSchedule,
};
