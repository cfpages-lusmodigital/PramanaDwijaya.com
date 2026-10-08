const state = {
  articles: [],
  productArticles: [],
  productGroups: [],
  productFilter: { groupId: '', categoryId: '', q: '' },
  productPage: 1,
  productPagination: { page: 1, pages: 1, total: 0, limit: 50 },
  productTotal: 0,
  productLastSyncedAt: null,
  credentials: null,
  editingSlug: null,
  editingMode: 'education',
  editingArticle: null,
  currentView: 'dashboard',
  quill: null,
  contentSourceHtml: '',
};

const PB_SITE = window.PB_ADMIN_SITE || {
  listingPublicPath: '/blog/',
  managedPublicPath: '/blog/managed/',
  defaultCategory: 'blog',
  productArticles: false,
};

const loginScreen = document.getElementById('login-screen');
const appShell = document.getElementById('app-shell');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const alertBox = document.getElementById('alert-box');
const articlesTableBody = document.getElementById('articles-table-body');
const articlesEmpty = document.getElementById('articles-empty');
const productTableBody = document.getElementById('product-table-body');
const productEmpty = document.getElementById('product-empty');
const articleForm = document.getElementById('article-form');

function slugify(text) {
  return String(text).toLowerCase().trim()
    .replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}
function encodeCredentials(username, password) {
  return btoa(`${username}:${password}`);
}
function authHeader() {
  return state.credentials ? { Authorization: `Basic ${state.credentials}` } : {};
}
function showAlert(message, type = 'success') {
  alertBox.textContent = message;
  alertBox.className = `toast toast-${type}`;
  alertBox.classList.remove('hidden');
}
function hideAlert() {
  alertBox.classList.add('hidden');
}

function parseYoutubeId(input) {
  const raw = String(input || '').trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.replace(/^\//, '').split('/')[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const fromQuery = url.searchParams.get('v');
      if (fromQuery && /^[a-zA-Z0-9_-]{11}$/.test(fromQuery)) return fromQuery;
      const embed = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embed) return embed[1];
      const shorts = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shorts) return shorts[1];
      const live = url.pathname.match(/\/live\/([a-zA-Z0-9_-]{11})/);
      if (live) return live[1];
    }
  } catch {
    /* ignore invalid URL */
  }
  const loose = raw.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return loose ? loose[1] : null;
}

function youtubeEmbedFigureHtml(videoId) {
  const id = escapeHtml(videoId);
  return (
    `<figure class="wp-block-embed aligncenter is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio">`
    + `<div class="wp-block-embed__wrapper">`
    + `<iframe title="YouTube video" width="1200" height="675" src="https://www.youtube.com/embed/${id}" `
    + `frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" `
    + `referrerpolicy="strict-origin-when-cross-origin"></iframe></div></figure>`
  );
}

function promotePlainYoutubeInHtml(html) {
  return String(html || '').replace(
    /<p([^>]*)>(\s*)(https?:\/\/[^\s<"'<>]+)(\s*)<\/p>/gi,
    (match, attrs, _ws1, url, _ws2) => {
      const id = parseYoutubeId(url.trim());
      return id ? youtubeEmbedFigureHtml(id) : match;
    }
  );
}

function embedYoutubeAtCursor(videoId) {
  const quill = initQuill();
  const range = quill.getSelection(true);
  quill.insertEmbed(range.index, 'youtubeEmbed', videoId, Quill.sources.USER);
  quill.setSelection(range.index + 1, Quill.sources.SILENT);
  syncQuill();
}

let youtubeAutoEmbedTimer = null;
function tryEmbedPlainYoutubeUrlInQuill() {
  const quill = state.quill;
  if (!quill) return;
  const raw = quill.getText().replace(/\n$/, '').trim();
  if (!raw || raw.includes('\n')) return;
  if (!/^https?:\/\//i.test(raw)) return;
  const id = parseYoutubeId(raw);
  if (!id) return;
  quill.setContents([]);
  quill.insertEmbed(0, 'youtubeEmbed', id, Quill.sources.USER);
  syncQuill();
}

function scheduleYoutubeAutoEmbed() {
  clearTimeout(youtubeAutoEmbedTimer);
  youtubeAutoEmbedTimer = setTimeout(tryEmbedPlainYoutubeUrlInQuill, 400);
}

function registerQuillYoutubeEmbed() {
  if (registerQuillYoutubeEmbed.done) return;
  registerQuillYoutubeEmbed.done = true;

  const BlockEmbed = Quill.import('blots/block/embed');
  const Delta = Quill.import('delta');
  const icons = Quill.import('ui/icons');
  icons.youtube = '<svg viewBox="0 0 18 18" aria-hidden="true"><rect class="ql-stroke" height="10" width="12" x="3" y="4"></rect><path class="ql-fill" d="M7 8l4 2-4 2z"></path></svg>';

  class YoutubeEmbedBlot extends BlockEmbed {
    static blotName = 'youtubeEmbed';

    static tagName = 'figure';

    static create(videoId) {
      const node = super.create();
      node.setAttribute('contenteditable', 'false');
      node.className = 'wp-block-embed aligncenter is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio ql-youtube-embed';
      const wrapper = document.createElement('div');
      wrapper.className = 'wp-block-embed__wrapper';
      const iframe = document.createElement('iframe');
      iframe.setAttribute('title', 'YouTube video');
      iframe.setAttribute('width', '1200');
      iframe.setAttribute('height', '675');
      iframe.setAttribute('src', `https://www.youtube.com/embed/${videoId}`);
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute(
        'allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      );
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      wrapper.appendChild(iframe);
      node.appendChild(wrapper);
      return node;
    }

    static value(node) {
      const iframe = node.querySelector('iframe');
      return parseYoutubeId(iframe?.getAttribute('src') || '') || '';
    }
  }

  Quill.register(YoutubeEmbedBlot);

  class WpPreserveBlock extends BlockEmbed {
    static blotName = 'wpPreserve';

    static tagName = 'DIV';

    static className = 'ql-wp-preserve';

    static create(html) {
      const node = super.create();
      node.setAttribute('contenteditable', 'false');
      node.innerHTML = html;
      return node;
    }

    static value(node) {
      return node.innerHTML;
    }
  }

  Quill.register(WpPreserveBlock);

  registerQuillYoutubeEmbed.attachClipboardMatchers = (quill) => {
    quill.clipboard.addMatcher('DIV', (node, delta) => {
      if (node.classList?.contains('wp-block-columns')) {
        return new Delta().insert({ wpPreserve: node.outerHTML });
      }
      return delta;
    });
    quill.clipboard.addMatcher('FIGURE', (node, delta) => {
      const iframe = node.querySelector('iframe[src*="youtube"]');
      if (iframe) {
        const id = parseYoutubeId(iframe.getAttribute('src') || '');
        if (id) return new Delta().insert({ youtubeEmbed: id });
      }
      if (node.classList?.contains('wp-block-image') || node.querySelector('img')) {
        return new Delta().insert({ wpPreserve: node.outerHTML });
      }
      return delta;
    });
    quill.clipboard.addMatcher('IFRAME', (node, delta) => {
      const id = parseYoutubeId(node.getAttribute('src') || '');
      if (!id) return delta;
      return new Delta().insert({ youtubeEmbed: id });
    });
    quill.clipboard.addMatcher('IMG', (node, delta) => {
      if (node.closest('figure') || node.closest('.wp-block-columns') || node.closest('.ql-wp-preserve')) {
        return delta;
      }
      const src = node.getAttribute('src');
      if (!src) return delta;
      return new Delta().insert({ wpPreserve: node.outerHTML });
    });
  };
}

function insertYoutubeVideo() {
  const quill = initQuill();
  const range = quill.getSelection(true);
  let selected = '';
  if (range?.length) {
    selected = quill.getText(range.index, range.length).trim();
  }
  const url = window.prompt(
    'Tempel URL YouTube (watch, Shorts, youtu.be, atau embed)',
    selected
  );
  if (!url) return;
  const id = parseYoutubeId(url);
  if (!id) {
    showAlert('URL YouTube tidak dikenali.', 'error');
    return;
  }
  if (range?.length) {
    quill.deleteText(range.index, range.length, Quill.sources.USER);
  }
  const insertAt = range?.length ? range.index : quill.getSelection(true).index;
  quill.insertEmbed(insertAt, 'youtubeEmbed', id, Quill.sources.USER);
  quill.setSelection(insertAt + 1, Quill.sources.SILENT);
  syncQuill();
}

function initQuill() {
  if (state.quill) return state.quill;
  registerQuillYoutubeEmbed();
  state.quill = new Quill('#quill-editor', {
    theme: 'snow',
    placeholder: 'Write the article…',
    modules: {
      toolbar: {
        container: [
          [{ header: [2, 3, false] }],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'link', 'image', 'youtube'],
          ['clean'],
        ],
        handlers: { image: pickEditorImage, youtube: insertYoutubeVideo },
      },
    },
  });
  registerQuillYoutubeEmbed.attachClipboardMatchers(state.quill);
  state.quill.root.addEventListener('paste', (event) => {
    const text = event.clipboardData?.getData('text/plain')?.trim();
    if (!text || /\n/.test(text)) return;
    const id = parseYoutubeId(text);
    if (!id) return;
    event.preventDefault();
    embedYoutubeAtCursor(id);
  });
  state.quill.on('text-change', () => {
    syncQuill();
    scheduleYoutubeAutoEmbed();
  });
  return state.quill;
}

function countContentImages(html) {
  return (String(html || '').match(/<img\b/gi) || []).length;
}
function countContentEmbeds(html) {
  return (String(html || '').match(/<iframe\b/gi) || []).length;
}

function getQuillHtmlForSave() {
  if (!state.quill) return '';
  const root = state.quill.root.cloneNode(true);
  root.querySelectorAll('.ql-wp-preserve').forEach((el) => {
    const html = el.innerHTML.trim();
    if (!html) {
      el.remove();
      return;
    }
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    el.replaceWith(tpl.content);
  });
  root.querySelectorAll('.ql-youtube-embed').forEach((el) => {
    el.classList.remove('ql-youtube-embed');
  });
  const html = root.innerHTML;
  const normalized = promotePlainYoutubeInHtml(html === '<p><br></p>' ? '' : html);
  return normalized === '<p><br></p>' ? '' : normalized;
}

function syncQuill() {
  document.getElementById('content').value = getQuillHtmlForSave();
}
function setQuillContent(html) {
  initQuill();
  state.contentSourceHtml = html || '';
  if (!html) state.quill.setText('');
  else {
    state.quill.setContents([]);
    state.quill.clipboard.dangerouslyPasteHTML(0, promotePlainYoutubeInHtml(html));
  }
  syncQuill();
  state.contentSourceHtml = getQuillHtmlForSave() || state.contentSourceHtml;
}
function updateSlugPreview() {
  const slug = document.getElementById('slug').value.trim() || slugify(document.getElementById('title').value);
  document.getElementById('slug-preview').textContent = `/${slug || 'slug'}.html`;
}
function updateCover() {
  const url = document.getElementById('featuredImage').value.trim();
  const wrap = document.getElementById('featured-preview');
  const img = document.getElementById('featured-preview-img');
  if (!url) {
    wrap.classList.add('hidden');
    img.removeAttribute('src');
    return;
  }
  img.src = url;
  wrap.classList.remove('hidden');
}
function setUploadStatus(message, isError = false) {
  const el = document.getElementById('upload-status');
  el.textContent = message;
  el.classList.toggle('hidden', !message);
  el.style.color = isError ? '#b42318' : '#1f7a4d';
}
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Browser tidak bisa membaca file gambar ini.'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

async function compressInBrowser(file) {
  if (!file.type || !file.type.startsWith('image/')) return file;
  const img = await loadImage(file);
  const maxWidth = 1600;
  const scale = img.width > maxWidth ? maxWidth / img.width : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let quality = 0.82;
  let blob = await canvasToBlob(canvas, quality);
  while (blob && blob.size > 480 * 1024 && quality > 0.45) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}

async function uploadImage(file) {
  let compressed = file;
  try {
    compressed = await compressInBrowser(file);
  } catch {
    compressed = file;
  }
  const formData = new FormData();
  formData.append('image', compressed, compressed.name || 'gambar.jpg');
  let response;
  try {
    response = await fetch('/api/upload', { method: 'POST', headers: authHeader(), body: formData });
  } catch {
    throw new Error('Tidak bisa menghubungi server upload. Restart npm run dev, lalu hard refresh /admin.');
  }
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error('Sesi login habis. Login admin lagi, lalu upload ulang.');
  if (response.status === 404) throw new Error('API upload belum aktif. Stop server lama, jalankan ulang npm run dev, hard refresh /admin.');
  if (!response.ok) throw new Error(data.error || `Upload gagal (HTTP ${response.status}).`);
  return data;
}

async function handleImageUpload(file, { targetInput = null, prefix = 'Image' } = {}) {
  if (!file) return null;
  setUploadStatus(`${prefix}: kompres lalu upload…`);
  const saved = await uploadImage(file);
  setUploadStatus(`${prefix} tersimpan (${Math.round((saved.size || 0) / 1024)} KB)`);
  if (targetInput) {
    targetInput.value = saved.url;
    if (targetInput.id === 'featuredImage') updateCover();
  }
  return saved.url;
}

function pickEditorImage() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.click();
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const url = await handleImageUpload(file, { prefix: 'Inline image' });
      const range = state.quill.getSelection(true);
      state.quill.insertEmbed(range.index, 'image', url);
      state.quill.setSelection(range.index + 1);
      syncQuill();
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };
}

function syncEditorFields() {
  const isProduct = state.editingMode === 'product';
  const isNew = !state.editingSlug;
  const isLegacy = state.editingArticle?.source === 'imported';
  document.getElementById('category-field').classList.toggle('hidden', isProduct || isLegacy);
  document.getElementById('product-category-field').classList.toggle('hidden', !isProduct);
  document.getElementById('slug-field').classList.toggle('hidden', (isProduct && !isNew) || isLegacy);
  document.getElementById('editor-title').textContent = isProduct
    ? (isNew ? 'Artikel produk baru' : 'Edit artikel produk')
    : (state.editingSlug ? 'Edit article' : 'New article');
  document.getElementById('editor-lede').textContent = isProduct
    ? (isNew
      ? 'Pilih kategori produk, lalu simpan. File HTML langsung dibuat di root site.'
      : 'Perubahan langsung ditulis ke file HTML artikel produk yang sudah live.')
    : 'Setelah simpan, halaman langsung masuk ke /blog/.';
  const topBtn = document.getElementById('new-article-top-btn');
  if (topBtn) {
    topBtn.textContent = isProduct || state.currentView === 'product-articles'
      ? 'Artikel produk baru'
      : 'Artikel baru';
  }
}

function populateProductCategorySelect(selectedId = '') {
  const select = document.getElementById('product-category');
  if (!select) return;
  const groups = state.productGroups.length
    ? state.productGroups
    : [];
  if (!groups.length) {
    select.innerHTML = '<option value="">Sinkronkan artikel dulu</option>';
    return;
  }
  select.innerHTML = groups.map((group) => `
    <optgroup label="${escapeHtml(group.label)}">
      ${group.categories.map((cat) => `
        <option value="${escapeHtml(cat.id)}" ${cat.id === selectedId ? 'selected' : ''}>
          ${escapeHtml(cat.label)}
        </option>
      `).join('')}
    </optgroup>
  `).join('');
  if (selectedId) select.value = selectedId;
}

function setView(view) {
  if (!PB_SITE.productArticles && (view === 'product-articles' || (view === 'editor' && state.editingMode === 'product'))) {
    view = 'articles';
  }
  state.currentView = view;
  document.querySelectorAll('.nav-item[data-view]').forEach((btn) => {
    const target = btn.dataset.view;
    const active = target === view
      || (view === 'editor' && target === (state.editingMode === 'product' ? 'product-articles' : 'articles'));
    btn.classList.toggle('is-active', active);
  });
  document.getElementById('dashboard-view').classList.toggle('hidden', view !== 'dashboard');
  document.getElementById('articles-view').classList.toggle('hidden', view !== 'articles');
  document.getElementById('product-articles-view').classList.toggle('hidden', view !== 'product-articles');
  document.getElementById('editor-view').classList.toggle('hidden', view !== 'editor');
  syncEditorFields();
  if (view === 'editor') initQuill();
  if (view === 'product-articles') loadProductArticles();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404 && path.includes('/api/product-')) {
      throw new Error('API artikel produk belum aktif. Stop server lama, jalankan ulang npm run dev, lalu hard refresh /admin.');
    }
    throw new Error(data.error || `Request failed (HTTP ${response.status}).`);
  }
  return data;
}
function formatDate(value) {
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
function effectivePublishedAt(article) {
  return article.publishedAt || article.updatedAt;
}
function isScheduledPublish(value) {
  if (!value) return false;
  return new Date(value).getTime() > Date.now();
}
function publishStatusPill(article, { legacyLabel = 'Legacy' } = {}) {
  if (article.source === 'imported') {
    return `<span class="pill pill-ref">${legacyLabel}</span>`;
  }
  if (isScheduledPublish(effectivePublishedAt(article))) {
    return '<span class="pill pill-scheduled">Terjadwal</span>';
  }
  return '<span class="pill pill-live">Live</span>';
}
function toLocal(value) {
  const date = new Date(value || Date.now());
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function renderStats() {
  document.getElementById('stat-total').textContent = state.articles.length;
  document.getElementById('stat-managed').textContent = state.articles.filter((item) => item.source === 'admin').length;
  document.getElementById('stat-imported').textContent = state.articles.filter((item) => item.source === 'imported').length;
  const navCount = document.getElementById('nav-article-count');
  if (navCount) navCount.textContent = state.articles.length;
}
function renderArticles(filter = '') {
  const query = filter.trim().toLowerCase();
  const rows = state.articles.filter((article) => {
    if (!query) return true;
    return article.title.toLowerCase().includes(query) || article.slug.toLowerCase().includes(query);
  });
  articlesTableBody.innerHTML = rows.map((article) => {
    const thumb = article.featuredImage
      ? `<img class="thumb" src="${escapeHtml(article.featuredImage)}" alt="">`
      : '<div class="thumb empty">IMG</div>';
    const publicPath = article.legacyHref || `/${article.slug}.html`;
    const actions = `<a class="btn btn-ghost" href="${escapeHtml(article.legacyHref || `/${encodeURIComponent(article.slug)}.html`)}" target="_blank" rel="noreferrer">View</a>
         <button class="btn btn-ghost" type="button" data-edit="${escapeHtml(article.slug)}">Edit</button>
         ${article.source === 'imported' ? '' : `<button class="btn btn-danger" type="button" data-delete="${escapeHtml(article.slug)}">Delete</button>`}`;
    return `<tr>
      <td><div class="row">${thumb}<div><b>${escapeHtml(article.title)}</b><span>${escapeHtml(article.excerpt || 'No excerpt')}</span></div></div></td>
      <td class="cell-path">${escapeHtml(publicPath)}</td>
      <td>${publishStatusPill(article)}</td>
      <td class="cell-nowrap">${formatDate(effectivePublishedAt(article))}</td>
      <td class="cell-actions"><div class="actions">${actions}</div></td>
    </tr>`;
  }).join('');
  articlesEmpty.classList.toggle('hidden', rows.length > 0);
  document.querySelector('.table-wrap')?.classList.toggle('hidden', rows.length === 0);
}

function resetEditor() {
  state.editingSlug = null;
  state.editingMode = 'education';
  state.editingArticle = null;
  articleForm.reset();
  document.getElementById('original-slug').value = '';
  document.getElementById('category').value = PB_SITE.defaultCategory;
  document.getElementById('author').value = 'admin';
  document.getElementById('publishedAt').value = toLocal();
  document.getElementById('slug').dataset.manual = 'false';
  populateProductCategorySelect();
  state.contentSourceHtml = '';
  setQuillContent('');
  updateSlugPreview();
  updateCover();
  setUploadStatus('');
}
function fillEditor(article, mode = 'education') {
  state.editingSlug = article.slug;
  state.editingMode = mode;
  state.editingArticle = article;
  document.getElementById('original-slug').value = article.slug;
  document.getElementById('title').value = article.title;
  document.getElementById('slug').value = article.slug;
  document.getElementById('slug').dataset.manual = 'true';
  document.getElementById('category').value = article.category || article.categoryLabel || 'artikel';
  populateProductCategorySelect(article.categoryId || '');
  document.getElementById('author').value = article.author || 'admin';
  document.getElementById('featuredImage').value = article.featuredImage || '';
  document.getElementById('excerpt').value = article.excerpt || '';
  document.getElementById('publishedAt').value = toLocal(article.publishedAt);
  setQuillContent(article.content || '');
  updateSlugPreview();
  updateCover();
  setUploadStatus('');
  syncEditorFields();
}
async function loadArticles() {
  const data = await api('/api/articles');
  state.articles = data.articles || [];
  renderStats();
  renderArticles(document.getElementById('search-input').value);
}

function renderProductCategoryNav() {
  const nav = document.getElementById('product-category-nav');
  if (!nav) return;
  nav.innerHTML = state.productGroups.map((group) => `
    <div class="product-group">
      <p class="product-group-title">${escapeHtml(group.label)}</p>
      ${group.categories.map((cat) => `
        <button type="button" class="product-cat-btn ${state.productFilter.categoryId === cat.id ? 'is-active' : ''}"
          data-group="${escapeHtml(group.id)}" data-category="${escapeHtml(cat.id)}">
          <span>${escapeHtml(cat.label)}</span>
          <span>${cat.count || 0}</span>
        </button>
      `).join('')}
    </div>
  `).join('');
}

function renderProductArticles() {
  const rows = state.productArticles;
  productTableBody.innerHTML = rows.map((article) => {
    const thumb = article.featuredImage
      ? `<img class="thumb" src="${escapeHtml(article.featuredImage)}" alt="">`
      : '<div class="thumb empty">IMG</div>';
    return `<tr>
      <td><div class="row">${thumb}<div><b>${escapeHtml(article.title)}</b><span>${escapeHtml(article.slug)}</span></div></div></td>
      <td class="cell-category"><span class="pill pill-ref">${escapeHtml(article.categoryLabel || '')}</span></td>
      <td>${publishStatusPill(article, { legacyLabel: 'Produk' })}</td>
      <td class="cell-nowrap">${formatDate(effectivePublishedAt(article))}</td>
      <td class="cell-path">/${escapeHtml(article.slug)}.html</td>
      <td class="cell-actions"><div class="actions">
        <a class="btn btn-ghost" href="/${encodeURIComponent(article.slug)}.html" target="_blank" rel="noreferrer">View</a>
        <button class="btn btn-ghost" type="button" data-edit-product="${escapeHtml(article.slug)}">Edit</button>
        <button class="btn btn-danger" type="button" data-delete-product="${escapeHtml(article.slug)}">Delete</button>
      </div></td>
    </tr>`;
  }).join('');

  const hasRows = rows.length > 0;
  productEmpty.classList.toggle('hidden', hasRows || state.productTotal > 0);
  document.querySelector('.product-table-card .table-wrap')?.classList.toggle('hidden', !hasRows);
  document.querySelector('.table-pagination')?.classList.toggle('hidden', !hasRows);

  const { page, pages, total } = state.productPagination;
  document.getElementById('product-page-label').textContent = `Halaman ${page} dari ${pages} · ${total} artikel`;
  document.getElementById('product-prev-page').disabled = page <= 1;
  document.getElementById('product-next-page').disabled = page >= pages;
  document.getElementById('product-result-count').textContent = state.productTotal
    ? `${state.productTotal.toLocaleString('id-ID')} artikel terindeks`
    : '';
  const navCount = document.getElementById('nav-product-count');
  if (navCount) navCount.textContent = state.productTotal.toLocaleString('id-ID');
  const hint = document.getElementById('product-sync-hint');
  if (hint) {
    hint.textContent = state.productLastSyncedAt
      ? `Terakhir disinkronkan ${formatDate(state.productLastSyncedAt)}.`
      : 'Artikel jual per wilayah, dikelompokkan sesuai menu Produk Kami.';
  }
  renderProductCategoryNav();
  populateProductCategorySelect(state.productFilter.categoryId);
}

async function loadProductArticles({ resetPage = false } = {}) {
  if (resetPage) state.productPage = 1;
  const params = new URLSearchParams({
    page: String(state.productPage),
    limit: '50',
  });
  if (state.productFilter.categoryId) params.set('category', state.productFilter.categoryId);
  if (state.productFilter.groupId) params.set('group', state.productFilter.groupId);
  if (state.productFilter.q) params.set('q', state.productFilter.q);

  const data = await api(`/api/product-articles?${params.toString()}`);
  state.productArticles = data.articles || [];
  state.productGroups = data.groups || [];
  state.productPagination = data.pagination || state.productPagination;
  state.productTotal = data.total || 0;
  state.productLastSyncedAt = data.lastSyncedAt || null;
  renderProductArticles();
}

async function importProductLibrary() {
  const result = await api('/api/import-product', { method: 'POST' });
  await loadProductArticles({ resetPage: true });
  showAlert(`${result.imported.toLocaleString('id-ID')} entri dari ${result.uniqueSlugs.toLocaleString('id-ID')} artikel unik terindeks.`);
}
function showApp() {
  loginScreen.classList.add('hidden');
  appShell.classList.remove('hidden');
}
function showLogin(message = '') {
  state.credentials = null;
  sessionStorage.removeItem('pb-admin-auth');
  appShell.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  loginError.textContent = message;
  loginError.classList.toggle('hidden', !message);
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideAlert();
  state.credentials = encodeCredentials(
    document.getElementById('username').value.trim(),
    document.getElementById('password').value
  );
  try {
    await api('/api/articles');
    sessionStorage.setItem('pb-admin-auth', state.credentials);
    showApp();
    await loadArticles();
    try {
      await loadProductArticles();
    } catch {
      // Index belum ada — user bisa sinkronkan manual.
    }
    setView('dashboard');
  } catch (error) {
    state.credentials = null;
    loginError.textContent = error.message;
    loginError.classList.remove('hidden');
  }
});

document.querySelectorAll('.nav-item[data-view]').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    if (button.dataset.view === 'editor') resetEditor();
    setView(button.dataset.view);
  });
});
document.getElementById('refresh-btn').addEventListener('click', async () => {
  try {
    await api('/api/import-legacy', { method: 'POST' });
    await loadArticles();
    showAlert('Library refreshed.');
  } catch (error) {
    showAlert(error.message, 'error');
  }
});
function openEditor() {
  resetEditor();
  state.editingMode = 'education';
  setView('editor');
}
function openProductEditor() {
  resetEditor();
  state.editingMode = 'product';
  populateProductCategorySelect(state.productFilter.categoryId || '');
  setView('editor');
}
document.getElementById('new-article-btn').addEventListener('click', openEditor);
document.getElementById('new-article-top-btn').addEventListener('click', () => {
  if (state.currentView === 'product-articles' || state.editingMode === 'product') {
    openProductEditor();
  } else {
    openEditor();
  }
});
document.getElementById('new-product-article-btn')?.addEventListener('click', openProductEditor);
document.querySelector('[data-open-editor]')?.addEventListener('click', openEditor);
document.getElementById('cancel-edit-btn').addEventListener('click', () => {
  const backView = state.editingMode === 'product' ? 'product-articles' : 'articles';
  resetEditor();
  setView(backView);
});
document.getElementById('search-input').addEventListener('input', (event) => {
  renderArticles(event.target.value);
});
document.getElementById('global-search').addEventListener('input', (event) => {
  const value = event.target.value;
  if (state.currentView === 'product-articles' || state.currentView === 'editor' && state.editingMode === 'product') {
    document.getElementById('product-search-input').value = value;
    state.productFilter.q = value;
    loadProductArticles({ resetPage: true }).catch((error) => showAlert(error.message, 'error'));
    if (value && state.currentView !== 'product-articles') setView('product-articles');
    return;
  }
  document.getElementById('search-input').value = value;
  renderArticles(value);
  if (value && state.currentView !== 'articles') setView('articles');
});
document.getElementById('title').addEventListener('input', (event) => {
  const slug = document.getElementById('slug');
  if (slug.dataset.manual !== 'true') slug.value = slugify(event.target.value);
  updateSlugPreview();
});
document.getElementById('slug').addEventListener('input', () => {
  document.getElementById('slug').dataset.manual = 'true';
  updateSlugPreview();
});
document.getElementById('featuredImage').addEventListener('input', updateCover);
document.getElementById('featured-upload-btn').addEventListener('click', () => {
  document.getElementById('featured-upload').click();
});
document.getElementById('featured-upload').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await handleImageUpload(file, { targetInput: document.getElementById('featuredImage'), prefix: 'Cover' });
    showAlert('Cover uploaded to wp-content.');
  } catch (error) {
    showAlert(error.message, 'error');
  } finally {
    event.target.value = '';
  }
});
document.getElementById('preview-btn').addEventListener('click', () => {
  if (state.editingArticle?.legacyHref) {
    window.open(state.editingArticle.legacyHref, '_blank', 'noopener,noreferrer');
    return;
  }
  const slug = state.editingMode === 'product'
    ? document.getElementById('original-slug').value.trim()
    : (document.getElementById('slug').value.trim() || slugify(document.getElementById('title').value));
  if (!slug) {
    showAlert('Add a title first.', 'error');
    return;
  }
  window.open(`/${encodeURIComponent(slug)}.html`, '_blank', 'noopener,noreferrer');
});
articlesTableBody.addEventListener('click', async (event) => {
  const editSlug = event.target.closest('[data-edit]')?.dataset.edit;
  const deleteSlug = event.target.closest('[data-delete]')?.dataset.delete;
  if (editSlug) {
    const article = state.articles.find((item) => item.slug === editSlug);
    if (!article) return;
    fillEditor(article);
    setView('editor');
  }
  if (deleteSlug) {
    const article = state.articles.find((item) => item.slug === deleteSlug);
    if (!article) return;
    if (!window.confirm(`Hapus “${article.title}”? File HTML di server ikut dihapus.`)) return;
    try {
      await api(`/api/articles/${encodeURIComponent(deleteSlug)}`, { method: 'DELETE' });
      await loadArticles();
      showAlert('Article removed.');
    } catch (error) {
      showAlert(error.message, 'error');
    }
  }
});
articleForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideAlert();
  syncQuill();
  const content = document.getElementById('content').value.trim();
  if (!content) {
    showAlert('Body cannot be empty.', 'error');
    return;
  }
  if (state.editingMode === 'product' && state.contentSourceHtml) {
    const before = countContentImages(state.contentSourceHtml);
    const after = countContentImages(content);
    if (after < before) {
      const ok = window.confirm(
        `Gambar dalam artikel berkurang (${before} → ${after}). Buka ulang artikel tanpa simpan jika ini tidak sengaja. Tetap simpan?`
      );
      if (!ok) return;
    }
  }
  const legacyArticle = state.editingArticle?.source === 'imported' ? state.editingArticle : null;
  if (legacyArticle) {
    const imgBefore = countContentImages(legacyArticle.content);
    const imgAfter = countContentImages(content);
    const embedBefore = countContentEmbeds(legacyArticle.content);
    const embedAfter = countContentEmbeds(content);
    if (imgAfter < imgBefore || embedAfter < embedBefore) {
      const ok = window.confirm(
        `Gambar/video di artikel lama berkurang (gambar ${imgBefore} → ${imgAfter}, video ${embedBefore} → ${embedAfter}). File asli akan ditimpa. Tetap simpan?`
      );
      if (!ok) return;
    }
  }
  const payload = {
    title: document.getElementById('title').value.trim(),
    slug: document.getElementById('slug').value.trim() || slugify(document.getElementById('title').value),
    category: document.getElementById('category').value.trim(),
    author: document.getElementById('author').value.trim(),
    featuredImage: document.getElementById('featuredImage').value.trim(),
    excerpt: document.getElementById('excerpt').value.trim(),
    content,
    publishedAt: document.getElementById('publishedAt').value
      ? new Date(document.getElementById('publishedAt').value).toISOString()
      : new Date().toISOString(),
  };
  const originalSlug = document.getElementById('original-slug').value;
  try {
    if (state.editingMode === 'product') {
      const categoryId = document.getElementById('product-category').value;
      if (!categoryId) {
        showAlert('Pilih kategori produk.', 'error');
        return;
      }
      if (originalSlug) {
        await api(`/api/product-articles/${encodeURIComponent(originalSlug)}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: payload.title,
            featuredImage: payload.featuredImage,
            excerpt: payload.excerpt,
            content: payload.content,
            categoryId,
            publishedAt: payload.publishedAt,
          }),
        });
        showAlert(`Artikel produk diperbarui di /${originalSlug}.html`);
      } else {
        const created = await api('/api/product-articles', {
          method: 'POST',
          body: JSON.stringify({
            title: payload.title,
            slug: payload.slug,
            featuredImage: payload.featuredImage,
            excerpt: payload.excerpt,
            content: payload.content,
            categoryId,
            publishedAt: payload.publishedAt,
          }),
        });
        showAlert(`Artikel produk dipublikasikan di /${created.article.slug}.html`);
      }
      resetEditor();
      await loadProductArticles();
      setView('product-articles');
      return;
    }
    if (originalSlug) {
      await api(`/api/articles/${encodeURIComponent(originalSlug)}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (legacyArticle) {
        showAlert(`Artikel lama diperbarui di ${decodeURIComponent(legacyArticle.legacyHref)}`);
      } else if (isScheduledPublish(payload.publishedAt)) {
        showAlert(`Disimpan. Terjadwal — /${payload.slug}.html baru bisa dibuka setelah waktu publish.`);
      } else {
        showAlert(`Updated. Live at /${payload.slug}.html`);
      }
    } else {
      await api('/api/articles', { method: 'POST', body: JSON.stringify(payload) });
      if (isScheduledPublish(payload.publishedAt)) {
        showAlert(`Disimpan. Terjadwal — /${payload.slug}.html akan tampil setelah waktu publish (belum ada di listing).`);
      } else {
        showAlert(`Published to /blog/ as /${payload.slug}.html`);
      }
    }
    resetEditor();
    await loadArticles();
    setView('articles');
  } catch (error) {
    showAlert(error.message, 'error');
  }
});

if (PB_SITE.productArticles) {
document.getElementById('import-product-btn')?.addEventListener('click', async () => {
  try {
    await importProductLibrary();
  } catch (error) {
    showAlert(error.message, 'error');
  }
});
document.getElementById('product-empty-import')?.addEventListener('click', async () => {
  try {
    await importProductLibrary();
  } catch (error) {
    showAlert(error.message, 'error');
  }
});
document.getElementById('product-refresh-btn')?.addEventListener('click', async () => {
  try {
    await loadProductArticles();
    showAlert('Daftar artikel produk diperbarui.');
  } catch (error) {
    showAlert(error.message, 'error');
  }
});
document.getElementById('product-search-input')?.addEventListener('input', (event) => {
  state.productFilter.q = event.target.value;
  loadProductArticles({ resetPage: true }).catch((error) => showAlert(error.message, 'error'));
});
document.getElementById('product-clear-filter')?.addEventListener('click', () => {
  state.productFilter = { groupId: '', categoryId: '', q: '' };
  document.getElementById('product-search-input').value = '';
  loadProductArticles({ resetPage: true }).catch((error) => showAlert(error.message, 'error'));
});
document.getElementById('product-category-nav')?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.productFilter.categoryId = button.dataset.category;
  state.productFilter.groupId = button.dataset.group;
  loadProductArticles({ resetPage: true }).catch((error) => showAlert(error.message, 'error'));
});
document.getElementById('product-prev-page')?.addEventListener('click', () => {
  if (state.productPage <= 1) return;
  state.productPage -= 1;
  loadProductArticles().catch((error) => showAlert(error.message, 'error'));
});
document.getElementById('product-next-page')?.addEventListener('click', () => {
  if (state.productPage >= state.productPagination.pages) return;
  state.productPage += 1;
  loadProductArticles().catch((error) => showAlert(error.message, 'error'));
});
productTableBody?.addEventListener('click', async (event) => {
  const editSlug = event.target.closest('[data-edit-product]')?.dataset.editProduct;
  const deleteSlug = event.target.closest('[data-delete-product]')?.dataset.deleteProduct;
  if (editSlug) {
    try {
      const data = await api(`/api/product-articles/${encodeURIComponent(editSlug)}`);
      fillEditor(data.article, 'product');
      setView('editor');
    } catch (error) {
      showAlert(error.message, 'error');
    }
    return;
  }
  if (deleteSlug) {
    const article = state.productArticles.find((item) => item.slug === deleteSlug);
    if (!article) return;
    if (!window.confirm(`Hapus “${article.title}”? File /${deleteSlug}.html ikut dihapus.`)) return;
    try {
      await api(`/api/product-articles/${encodeURIComponent(deleteSlug)}`, { method: 'DELETE' });
      await loadProductArticles();
      showAlert('Artikel produk dihapus.');
    } catch (error) {
      showAlert(error.message, 'error');
    }
  }
});

}

async function bootstrap() {
  showApp();
  try {
    await loadArticles();
    if (PB_SITE.productArticles) {
      try {
        await loadProductArticles();
      } catch {
        // Index belum ada — user bisa sinkronkan manual.
      }
    }
    setView('dashboard');
  } catch (error) {
    showAlert(error.message, 'error');
  }
}
bootstrap();
