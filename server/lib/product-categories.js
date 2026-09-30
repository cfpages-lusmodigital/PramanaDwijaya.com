const PRODUCT_GROUPS = [
  {
    id: 'atap-baja-ringan',
    label: 'Atap Baja Ringan',
    categories: [
      { id: 'atap-galvalum', label: 'Atap Genteng Metal', listingDir: 'atap-galvalum', slugPrefix: 'jual-atap-galvalum-' },
      { id: 'atap-lengkung', label: 'Atap Lengkung', listingDir: 'atap-lengkung', slugPrefix: 'jual-atap-lengkung-' },
      { id: 'atap-genteng', label: 'Atap Pasir', listingDir: 'atap-genteng', slugPrefix: 'jual-atap-pasir-' },
      { id: 'atap-seng', label: 'Atap Seng Galvanis', listingDir: 'atap-seng', slugPrefix: 'jual-atap-seng-' },
      { id: 'atap-spandek', label: 'Atap Spandek', listingDir: 'atap-spandek', slugPrefix: 'jual-atap-spandek-' },
      { id: 'canal-c', label: 'Canal C Galvalum', listingDir: 'canal-c', slugPrefix: 'jual-canal-c-' },
      { id: 'hollow-galvalum', label: 'Hollow Galvalum', listingDir: 'hollow-galvalum', slugPrefix: 'jual-hollow-galvalum-' },
      { id: 'reng-galvalum', label: 'Reng Galvalum', listingDir: 'reng-galvalum', slugPrefix: 'jual-reng-galvalum-' },
      { id: 'bondek', label: 'Plat Bondek', listingDir: 'bondek', slugPrefix: 'jual-bondek-' },
    ],
  },
  {
    id: 'pagar-kawat',
    label: 'Pagar dan Kawat',
    categories: [
      { id: 'pagar-brc', label: 'Pagar BRC', listingDir: 'pagar-brc', slugPrefix: 'jual-pagar-brc-' },
      { id: 'kawat-harmonika', label: 'Kawat Harmonika', listingDir: 'kawat-harmonika', slugPrefix: 'jual-kawat-harmonika-' },
      { id: 'weldedmesh', label: 'Weldedmesh', listingDir: 'weldedmesh', slugPrefix: 'jual-weldedmesh-' },
      { id: 'bronjong', label: 'Kawat Bronjong', listingDir: 'bronjong', slugPrefix: 'jual-bronjong-' },
      { id: 'kawat-loket-ulir', label: 'Kawat Loket Ulir', listingDir: 'kawat-loket-ulir' },
      { id: 'expanded-metal', label: 'Expanded Metal', listingDir: 'expanded-metal', slugPrefix: 'jual-expanded-metal-' },
      { id: 'kawat-duri', label: 'Kawat Duri', listingDir: 'kawat-duri', slugPrefix: 'jual-kawat-duri-' },
      { id: 'kawat-loket', label: 'Kawat Loket', listingDir: 'kawat-loket', slugPrefix: 'jual-kawat-loket-' },
    ],
  },
  {
    id: 'besi-baja',
    label: 'Besi dan Baja',
    categories: [
      { id: 'besi-wf', label: 'Besi WF', listingDir: 'besi-wf', slugPrefix: 'jual-besi-wf-' },
      { id: 'besi-cnp', label: 'Besi CNP', listingDir: 'besi-cnp', slugPrefix: 'jual-besi-cnp-' },
      { id: 'besi-unp', label: 'Besi UNP', listingDir: 'besi-unp', slugPrefix: 'jual-besi-unp-' },
      { id: 'besi-h-beam', label: 'Besi H-Beam', listingDir: 'besi-h-beam', slugPrefix: 'jual-besi-h-beam-' },
      { id: 'besi-inp', label: 'Besi INP / I-Beam', listingDir: 'besi-inp', slugPrefix: 'jual-besi-inp-' },
      { id: 'besi-siku', label: 'Besi Siku', listingDir: 'besi-siku', slugPrefix: 'jual-besi-siku-' },
      { id: 'besi-nako', label: 'Besi Nako', listingDir: 'besi-nako', slugPrefix: 'jual-besi-nako-' },
    ],
  },
  {
    id: 'besi-beton',
    label: 'Besi Beton Batangan',
    categories: [
      { id: 'besi-bjtp', label: 'Besi BjTP dan BjTS', listingDir: 'besi-bjtp', slugPrefix: 'jual-besi-bjtp-' },
      { id: 'wiremesh', label: 'Wiremesh', listingDir: 'wiremesh', slugPrefix: 'jual-wiremesh-' },
    ],
  },
  {
    id: 'plat',
    label: 'Plat',
    categories: [
      { id: 'plat-lubang', label: 'Plat Lubang', listingDir: 'plat-lubang', slugPrefix: 'jual-plat-lubang-' },
      { id: 'plat-strip', label: 'Plat Strip', listingDir: 'plat-strip', slugPrefix: 'jual-plat-strip-' },
      { id: 'plat-besi', label: 'Plat Besi', listingDir: 'plat-besi', slugPrefix: 'jual-plat-besi-' },
      { id: 'plat-bordes', label: 'Plat Bordes', listingDir: 'plat-bordes', slugPrefix: 'jual-plat-bordes-' },
      { id: 'plat-hitam', label: 'Plat Hitam', listingDir: 'plat-hitam', slugPrefix: 'jual-plat-hitam-' },
      { id: 'plat-kapal', label: 'Plat Kapal', listingDir: 'plat-kapal', slugPrefix: 'jual-plat-kapal-' },
    ],
  },
  {
    id: 'hollow-pipa',
    label: 'Hollow dan Pipa',
    categories: [
      { id: 'hollow-galvanis', label: 'Hollow Galvanis', listingDir: 'hollow-galvanis', slugPrefix: 'jual-hollow-galvanis-' },
      { id: 'hollow-hitam', label: 'Hollow Hitam', listingDir: 'hollow-hitam', slugPrefix: 'jual-hollow-hitam-' },
      { id: 'pipa-galvanis', label: 'Pipa Galvanis', listingDir: 'pipa-galvanis', slugPrefix: 'jual-pipa-galvanis-' },
      { id: 'pipa-hitam', label: 'Pipa Hitam', listingDir: 'pipa-hitam', slugPrefix: 'jual-pipa-hitam-' },
    ],
  },
  {
    id: 'steel-grating',
    label: 'Steel Grating',
    categories: [
      { id: 'plain-grating', label: 'Plain Steel Grating', listingDir: 'plain-grating', slugPrefix: 'jual-plain-grating-' },
      { id: 'serrated-grating', label: 'Serrated Steel Grating', listingDir: 'serrated-grating', slugPrefix: 'jual-serrated-grating-' },
    ],
  },
];

const CATEGORY_BY_ID = new Map();
const CATEGORY_BY_LISTING = new Map();

for (const group of PRODUCT_GROUPS) {
  for (const category of group.categories) {
    CATEGORY_BY_ID.set(category.id, { ...category, groupId: group.id, groupLabel: group.label });
    CATEGORY_BY_LISTING.set(category.listingDir, { ...category, groupId: group.id, groupLabel: group.label });
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

const SLUG_MATCHERS = getAllCategories()
  .filter((category) => category.slugPrefix)
  .map((category) => ({ prefix: category.slugPrefix, category }))
  .sort((a, b) => b.prefix.length - a.prefix.length);

function resolveCategoryFromSlug(slug) {
  const match = SLUG_MATCHERS.find((item) => slug.startsWith(item.prefix));
  return match ? match.category : null;
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
