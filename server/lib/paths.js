const path = require('path');
const site = require('./site-config');

const ROOT = path.join(__dirname, '..', '..');

module.exports = {
  ROOT,
  site,
  DATA_DIR: path.join(ROOT, 'data'),
  ARTICLES_FILE: path.join(ROOT, 'data', 'articles.json'),
  TEMPLATES_DIR: path.join(ROOT, 'templates'),
  ADMIN_DIR: path.join(ROOT, 'admin'),
  LISTING_SEGMENT: site.listingSegment,
  LISTING_PAGE_FILE: path.join(ROOT, site.listingSegment, 'index.html'),
  MANAGED_LISTING_DIR: path.join(ROOT, site.listingSegment, 'managed'),
  MANAGED_LISTING_FILE: path.join(ROOT, site.listingSegment, 'managed', 'index.html'),
  articleHtmlPath(slug) {
    return path.join(ROOT, `${slug}.html`);
  },
};
