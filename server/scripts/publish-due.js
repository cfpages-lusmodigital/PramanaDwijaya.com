const fs = require('fs');
const { readArticles } = require('../lib/store');
const { rebuildListing } = require('../lib/articles');
const { articleHtmlPath } = require('../lib/paths');
const { isPublished } = require('../lib/publish');

async function main() {
  const articles = (await readArticles()).filter((item) => item.managed && item.source !== 'imported');
  const outOfSync = articles.filter((item) => isPublished(item) !== fs.existsSync(articleHtmlPath(item.slug)));

  if (outOfSync.length === 0) {
    console.log('Artikel terjadwal sudah ada di HTML. Tayang otomatis di browser saat waktunya, tanpa push kedua.');
    return;
  }

  await rebuildListing();
  outOfSync.forEach((item) => {
    console.log(`${isPublished(item) ? 'Publish' : 'Tarik (terjadwal)'}: /${item.slug}.html`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
