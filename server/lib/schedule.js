const { readArticles } = require('./store');
const { getPublishedAt } = require('./publish');
const { site } = require('./paths');

let educationSlugs = new Map();
let productSlugs = new Map();
let wakeTimer = null;

async function refreshPublishIndex() {
  const articles = await readArticles();
  educationSlugs = new Map();
  for (const article of articles) {
    if (article.managed) {
      educationSlugs.set(article.slug, getPublishedAt(article));
    }
  }

  productSlugs = new Map();
  if (site.features.productArticles) {
    const { readProductIndex } = require('./product-store');
    const { articles: products } = await readProductIndex();
    for (const article of products) {
      if (!productSlugs.has(article.slug)) {
        productSlugs.set(article.slug, getPublishedAt(article));
      }
    }
  }
}

function isSlugPubliclyVisible(slug, now = new Date()) {
  const nowMs = now.getTime();
  if (educationSlugs.has(slug)) {
    const at = educationSlugs.get(slug);
    if (!at) return true;
    const when = new Date(at).getTime();
    return !Number.isNaN(when) && when <= nowMs;
  }
  if (productSlugs.has(slug)) {
    const at = productSlugs.get(slug);
    if (!at) return true;
    const when = new Date(at).getTime();
    return !Number.isNaN(when) && when <= nowMs;
  }
  return true;
}

async function resolveCmsPublishAt(slug) {
  if (educationSlugs.has(slug)) {
    return { cms: true, at: educationSlugs.get(slug) };
  }
  if (productSlugs.has(slug)) {
    return { cms: true, at: productSlugs.get(slug) };
  }

  const articles = await readArticles();
  const edu = articles.find((item) => item.managed && item.slug === slug);
  if (edu) {
    const at = getPublishedAt(edu);
    educationSlugs.set(slug, at);
    return { cms: true, at };
  }

  if (site.features.productArticles) {
    const { readProductIndex } = require('./product-store');
    const { articles: products } = await readProductIndex();
    const prod = products.find((item) => item.slug === slug);
    if (prod) {
      const at = getPublishedAt(prod);
      productSlugs.set(slug, at);
      return { cms: true, at };
    }
  }

  return { cms: false, at: null };
}

async function isSlugPubliclyVisibleAsync(slug, now = new Date()) {
  const resolved = await resolveCmsPublishAt(slug);
  if (!resolved.cms) return true;
  const at = resolved.at;
  if (!at) return true;
  const when = new Date(at).getTime();
  if (Number.isNaN(when)) return true;
  return when <= now.getTime();
}

function planNextWake() {
  if (wakeTimer) {
    clearTimeout(wakeTimer);
    wakeTimer = null;
  }

  const now = Date.now();
  let nextAt = null;

  for (const at of [...educationSlugs.values(), ...productSlugs.values()]) {
    if (!at) continue;
    const when = new Date(at).getTime();
    if (Number.isNaN(when) || when <= now) continue;
    nextAt = nextAt === null ? when : Math.min(nextAt, when);
  }

  if (nextAt === null) return;

  const delay = Math.min(nextAt - now + 750, 2_147_483_647);
  wakeTimer = setTimeout(async () => {
    await refreshPublishIndex();
    planNextWake();
  }, delay);
}

async function notifyPublishScheduleChanged() {
  await refreshPublishIndex();
  planNextWake();
}

async function initScheduleWatcher() {
  await refreshPublishIndex();
  planNextWake();
}

function createPublishGuardMiddleware() {
  return async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const match = req.path.match(/^\/([a-z0-9][a-z0-9-]*)\.html$/i);
    if (!match) return next();
    try {
      const visible = await isSlugPubliclyVisibleAsync(match[1]);
      if (visible) return next();
    } catch (error) {
      console.warn('Publish guard error:', error.message);
      return next();
    }
    res.status(404);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(
      '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Belum tersedia</title></head>'
      + '<body style="font-family:system-ui,sans-serif;padding:2rem"><h1>Belum tersedia</h1>'
      + '<p>Artikel ini dijadwalkan dan belum dipublikasikan.</p></body></html>'
    );
  };
}

module.exports = {
  refreshPublishIndex,
  notifyPublishScheduleChanged,
  initScheduleWatcher,
  createPublishGuardMiddleware,
  isSlugPubliclyVisible,
  isSlugPubliclyVisibleAsync,
};
