# Admin Artikel — pramanadwijaya.com

CMS artikel blog (parity fitur inti dengan pramanabaja.id, tanpa modul artikel produk `jual-*`).

## Setup

```bash
cd PramanaDwijaya.com
npm install
cp .env.example .env
npm run dev
```

- Admin: `http://localhost:8002/admin`
- Blog: `http://localhost:8002/blog/`
- Backup listing: `http://localhost:8002/blog/managed/`

## Alur publish

1. Artikel admin → `{slug}.html` di root repo
2. Kartu baru disisipkan di atas listing **`/blog/index.html`** (tema blog WordPress)
3. `blog-inject.js` menampilkan artikel admin saat dev server jalan
4. Jadwal publish: file `{slug}.html` baru dibuat saat waktunya tiba. Di website live, workflow `Publish scheduled articles` (GitHub Actions, tiap 15 menit) menjalankan `server/scripts/publish-due.js` lalu commit ke `main` — jadi `data/articles.json` wajib ikut di-commit.
5. Artikel lama (arsip WordPress) diedit langsung di file aslinya (`/tahun/bulan/hari/slug/index.html`) dan tidak bisa dihapus dari admin.
6. `functions/_middleware.js` + `_routes.json` menutup `/data`, `/server`, `/templates` dll. di Cloudflare Pages.

## Import metadata lama

```bash
npm run import-articles
```

Script membaca link dari `blog/index.html` dan file HTML terkait (bisa butuh penyesuaian path `/tahun/bulan/hari/`).

## Commit setelah publish

- `data/articles.json`, `{slug}.html`, `blog/index.html`, `blog/managed/index.html`, upload baru di `wp-content/`
