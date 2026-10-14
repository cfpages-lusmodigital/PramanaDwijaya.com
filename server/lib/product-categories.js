/** Kategori sesuai menu Produk di pramanadwijaya.com */
const PRODUCT_GROUPS = [
  {
    id: 'atap',
    label: 'Atap',
    categories: [
      { id: 'galvalum-aksesoris', label: 'Atap Galvalum / Aksesoris', listingDir: 'produk/atap/galvalum-aksesoris' },
      { id: 'atap-lengkung', label: 'Atap Lengkung', listingDir: 'produk/atap/lengkung' },
      { id: 'bondek-floor-deck', label: 'Bondek (Floordeck)', listingDir: 'produk/atap/bondek-floor-deck' },
      { id: 'genteng-metal', label: 'Genteng Metal', listingDir: 'produk/atap/genteng-metal' },
      { id: 'hollow-galvalum', label: 'Hollow Galvalum', listingDir: 'produk/atap/hollow-galvalum' },
      { id: 'seng-gelombang', label: 'Seng Gelombang', listingDir: 'produk/atap/seng-gelombang-2' },
      { id: 'plat-galvalum-seng-roll', label: 'Plat Galvalum & Seng Roll', listingDir: 'produk/atap/plat-galvalum-seng-roll' },
      { id: 'truss-canal-c-reng', label: 'Truss (Canal C & Reng Galvalum)', listingDir: 'produk/atap/truss-canal-c-reng-galvalum' },
    ],
  },
  {
    id: 'besi-baja',
    label: 'Besi & Baja',
    categories: [
      { id: 'wide-flange', label: 'Besi WF (Wide Flange)', listingDir: 'produk/baja/wide-flange' },
      { id: 'besi-hollow', label: 'Besi Hollow', listingDir: 'produk/baja/hollow' },
      { id: 'unp-cnp', label: 'Besi UNP / CNP', listingDir: 'produk/baja/unp-cnp' },
      { id: 'besi-siku', label: 'Besi Siku', listingDir: 'produk/baja/besi-siku' },
      { id: 'h-beam', label: 'H-Beam', listingDir: 'produk/baja/h-beam' },
    ],
  },
  {
    id: 'besi-beton',
    label: 'Besi Beton',
    categories: [
      { id: 'bjtp-bjts', label: 'BjTP dan BjTS', listingDir: 'produk/besi-beton/bjtp-bjts' },
      { id: 'virkan', label: 'Besi Beton Virkan', listingDir: 'produk/besi-beton/virkan' },
      { id: 'begel-kolom', label: 'Besi Beton Begel & Kolom', listingDir: 'produk/besi-beton/begel-kolom' },
      { id: 'wire-rod', label: 'Wire Rod', listingDir: 'produk/besi-beton/wire-rod' },
    ],
  },
  {
    id: 'plat',
    label: 'Plat',
    categories: [
      { id: 'plat-bordes', label: 'Plat Bordes', listingDir: 'produk/plat/bordes' },
      { id: 'plat-hitam', label: 'Plat Hitam', listingDir: 'produk/plat/hitam' },
      { id: 'plat-kapal', label: 'Plat Kapal', listingDir: 'produk/plat/kapal' },
      { id: 'plat-strip', label: 'Plat Strip', listingDir: 'produk/plat/strip' },
    ],
  },
  {
    id: 'pipa',
    label: 'Pipa',
    categories: [
      { id: 'pipa-galvanis', label: 'Pipa Galvanis', listingDir: 'produk/pipa/galvanis-spindo' },
      { id: 'tiang-pancang', label: 'Pipa Tiang Pancang', listingDir: 'produk/pipa/tiang-pancang' },
      { id: 'pipa-hitam', label: 'Pipa Hitam', listingDir: 'produk/pipa/besi-hitam' },
    ],
  },
  {
    id: 'steel-grating',
    label: 'Steel Grating',
    categories: [
      { id: 'grating-lantai', label: 'Steel Grating Lantai', listingDir: 'steel-grating-lantai' },
      { id: 'grating-anak-tangga', label: 'Steel Grating Anak Tangga', listingDir: 'steel-grating-anak-tangga' },
      { id: 'grating-drainase', label: 'Steel Grating Drainase', listingDir: 'steel-grating-drainase' },
      { id: 'plain-grating', label: 'Plain Steel Grating', listingDir: 'plain-steel-grating' },
      { id: 'serrated-grating', label: 'Serrated Steel Grating', listingDir: 'serrated-steel-grating' },
      { id: 'custom-grating', label: 'Custom Steel Grating', listingDir: 'custom-steel-grating' },
    ],
  },
  {
    id: 'wire-mesh',
    label: 'Wire Mesh',
    categories: [
      { id: 'bendrat', label: 'Bendrat', listingDir: 'produk/wire-mesh/bendrat' },
      { id: 'bronjong', label: 'Bronjong / Gabion', listingDir: 'produk/wire-mesh/kawat-bronjong-gabion' },
      { id: 'kawat-harmonika', label: 'Kawat Harmonika', listingDir: 'produk/wire-mesh/kawat-harmonika' },
      { id: 'pagar-brc', label: 'Pagar BRC & Aksesoris', listingDir: 'produk/wire-mesh/pagar-brc-aksesoris' },
      { id: 'kawat-duri', label: 'Kawat Duri', listingDir: 'produk/wire-mesh/kawat-duri' },
      { id: 'mesh-stainless', label: 'Mesh Stainless', listingDir: 'produk/wire-mesh/stainless' },
      { id: 'kawat-loket', label: 'Kawat Loket', listingDir: 'produk/wire-mesh/kawat-loket' },
    ],
  },
  {
    id: 'stainless-steel',
    label: 'Stainless Steel',
    categories: [
      { id: 'ss-sheet', label: 'Lembaran', listingDir: 'produk/stainless-steel/sheet' },
      { id: 'ss-roll', label: 'Roll', listingDir: 'produk/stainless-steel/roll' },
      { id: 'ss-polish', label: 'Plat Polish', listingDir: 'produk/stainless-steel/plat-polish' },
      { id: 'ss-perforated', label: 'Plat Perforated', listingDir: 'produk/stainless-steel/plat-perforated' },
      { id: 'ss-bordes', label: 'Plat Bordes', listingDir: 'produk/stainless-steel/plat-bordes' },
      { id: 'ss-pipa-hollow', label: 'Pipa Kotak', listingDir: 'produk/stainless-steel/pipa-hollow' },
      { id: 'ss-pipa-bulat', label: 'Pipa Bulat', listingDir: 'produk/stainless-steel/pipa-bulat' },
    ],
  },
];

const CATEGORY_BY_ID = new Map();
const CATEGORY_BY_LISTING = new Map();

for (const group of PRODUCT_GROUPS) {
  for (const category of group.categories) {
    const record = { ...category, groupId: group.id, groupLabel: group.label };
    CATEGORY_BY_ID.set(category.id, record);
    CATEGORY_BY_LISTING.set(category.listingDir, record);
  }
}

function getProductGroups() {
  return PRODUCT_GROUPS;
}

function getCategoryById(id) {
  return CATEGORY_BY_ID.get(id) || null;
}

function getAllCategories() {
  return [...CATEGORY_BY_ID.values()];
}

function resolveCategoryFromSlug() {
  return null;
}

module.exports = {
  PRODUCT_GROUPS,
  getProductGroups,
  getCategoryById,
  getAllCategories,
  resolveCategoryFromSlug,
  CATEGORY_BY_ID,
  CATEGORY_BY_LISTING,
};
