function getPublishedAt(article) {
  if (!article) return null;
  return article.publishedAt || article.updatedAt || null;
}

function isPublished(article, now = new Date()) {
  const at = getPublishedAt(article);
  if (!at) return true;
  const when = new Date(at).getTime();
  if (Number.isNaN(when)) return true;
  return when <= now.getTime();
}

function filterPublished(articles, now = new Date()) {
  return articles.filter((article) => isPublished(article, now));
}

function publishStatus(article, now = new Date()) {
  return isPublished(article, now) ? 'published' : 'scheduled';
}

module.exports = {
  getPublishedAt,
  isPublished,
  filterPublished,
  publishStatus,
};
