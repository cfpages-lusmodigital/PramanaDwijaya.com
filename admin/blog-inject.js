(() => {
  const CONTENT_SELECTOR = 'main#main, #main.site-main, #content[role="main"], #content';
  const FALLBACK_SELECTOR = '.rt-row.rt-content-loader, .list-layout-wrapper';
  const DEFAULT_THUMB = '/wp-content/uploads/2016/05/atap-baja-ringan.jpg';

  function card(article) {
    const href = `/${article.slug}.html`;
    const image = article.featuredImage || DEFAULT_THUMB;
    const wrap = document.createElement('article');
    wrap.className = 'post type-post status-publish format-standard hentry pb-admin-article';
    wrap.setAttribute('data-pb-admin', 'true');
    if (article.publishedAt) wrap.setAttribute('data-pb-publish', article.publishedAt);
    wrap.id = `post-pb-${article.slug}`;
    wrap.innerHTML = `
      <header class="entry-header">
        <h2 class="entry-title"><a href="${href}" rel="bookmark"></a></h2>
      </header>
      <div class="entry-summary">
        <p class="pb-excerpt"></p>
        <p><a href="${href}">Baca selengkapnya &rarr;</a></p>
      </div>`;
    wrap.querySelector('.entry-title a').textContent = article.title;
    wrap.querySelector('.pb-excerpt').textContent = article.excerpt || '';
    wrap.querySelector('.pb-excerpt').dataset.thumb = image;
    return wrap;
  }

  async function run() {
    let container = document.querySelector(CONTENT_SELECTOR);
    if (!container) {
      container = document.querySelector(FALLBACK_SELECTOR);
    }
    if (!container) return;

    const response = await fetch('/api/public/articles');
    if (!response.ok) return;
    const data = await response.json();
    const articles = data.articles || [];

    container.querySelectorAll('[data-pb-admin="true"]').forEach((node) => node.remove());

    const fragment = document.createDocumentFragment();
    articles
      .slice()
      .reverse()
      .forEach((article) => {
        fragment.appendChild(card(article));
      });
    container.insertBefore(fragment, container.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
