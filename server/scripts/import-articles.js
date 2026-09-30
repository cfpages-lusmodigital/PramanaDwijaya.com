require('dotenv').config();

const { importLegacyArticles } = require('../lib/import-legacy');

importLegacyArticles()
  .then((result) => {
    if (result.imported === 0) {
      console.log('Tidak ada artikel baru yang diimpor.');
      return;
    }
    console.log(`Berhasil mengimpor ${result.imported} artikel ke data/articles.json`);
    console.log(result.slugs.join('\n'));
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
