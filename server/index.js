require('dotenv').config();

const express = require('express');
const multer = require('multer');
const {
  listArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  rebuildListing,
} = require('./lib/articles');
const { createAuthMiddleware } = require('./lib/auth');
const { filterPublished } = require('./lib/publish');
const { saveUploadedImage } = require('./lib/upload');
const { importLegacyArticles } = require('./lib/import-legacy');
const { ROOT, ADMIN_DIR, site } = require('./lib/paths');
const {
  initScheduleWatcher,
  createPublishGuardMiddleware,
  notifyPublishScheduleChanged,
} = require('./lib/schedule');

const app = express();
const port = Number(process.env.PORT || 8002);
const auth = createAuthMiddleware();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024 },
});

app.use(express.json({ limit: '2mb' }));

function sendPublicArticles(_req, res) {
  return listArticles()
    .then((articles) => {
      res.json({
        articles: filterPublished(articles)
          .filter((article) => article.source !== 'imported')
          .map((article) => ({
            slug: article.slug,
            title: article.title,
            excerpt: article.excerpt,
            featuredImage: article.featuredImage,
            publishedAt: article.publishedAt,
          })),
      });
    })
    .catch((error) => {
      res.status(500).json({ error: error.message });
    });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: site.siteId, features: site.features });
});

app.get('/api/public/articles', sendPublicArticles);

app.get('/api/articles', auth, async (_req, res) => {
  try {
    const articles = await listArticles();
    res.json({ articles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/articles/:slug', auth, async (req, res) => {
  try {
    const article = await getArticle(req.params.slug);
    if (!article) {
      return res.status(404).json({ error: 'Artikel tidak ditemukan.' });
    }
    return res.json({ article });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/articles', auth, async (req, res) => {
  try {
    const article = await createArticle(req.body);
    res.status(201).json({ article });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/articles/:slug', auth, async (req, res) => {
  try {
    const article = await updateArticle(req.params.slug, req.body);
    res.json({ article });
  } catch (error) {
    const status = /tidak ditemukan/i.test(error.message) ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

app.delete('/api/articles/:slug', auth, async (req, res) => {
  try {
    const article = await deleteArticle(req.params.slug);
    res.json({ article });
  } catch (error) {
    const status = /tidak ditemukan/i.test(error.message) ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

app.post('/api/rebuild-listing', auth, async (_req, res) => {
  try {
    await rebuildListing();
    await notifyPublishScheduleChanged();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/import-legacy', auth, async (_req, res) => {
  try {
    const result = await importLegacyArticles();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', auth, upload.single('image'), async (req, res) => {
  try {
    const saved = await saveUploadedImage(req.file);
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const PRIVATE_PATH_RE = /^\/(?:data|server|templates|node_modules|\.[^/]+)(?:\/|$)|^\/(?:package(?:-lock)?\.json|README-ADMIN\.md)$/i;
app.use((req, res, next) => (PRIVATE_PATH_RE.test(req.path) ? res.status(404).end() : next()));
app.use(createPublishGuardMiddleware());
app.use(express.static(ROOT, { index: 'index.html', dotfiles: 'ignore' }));
app.use('/admin', express.static(ADMIN_DIR, { index: 'index.html' }));

app.use((error, _req, res, _next) => {
  if (error && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File terlalu besar. Maksimal 40MB, nanti dikompres di bawah 500KB.' });
  }
  if (error && error.name === 'MulterError') {
    return res.status(400).json({ error: error.message });
  }
  return res.status(500).json({ error: error.message || 'Terjadi kesalahan server.' });
});

async function start() {
  try {
    await rebuildListing();
    await initScheduleWatcher();
  } catch (error) {
    console.warn('Listing admin belum tersedia:', error.message);
  }

  try {
    const result = await importLegacyArticles();
    if (result.imported > 0) {
      console.log(`Impor artikel lama: ${result.imported} artikel baru (total ${result.total}).`);
    }
  } catch (error) {
    console.warn('Impor artikel lama gagal:', error.message);
  }

  app.listen(port, () => {
    console.log(`${site.siteLabel} — dev server http://localhost:${port}`);
    console.log(`Admin: http://localhost:${port}/admin`);
    console.log(`Blog listing: http://localhost:${port}${site.listingPublicPath}`);
  });
}

start();
