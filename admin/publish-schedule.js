(() => {
  const HOLD_ID = 'pb-schedule-hold';

  function timeOf(iso) {
    if (!iso) return null;
    const when = new Date(iso).getTime();
    return Number.isNaN(when) ? null : when;
  }

  function isDue(iso) {
    const when = timeOf(iso);
    return when === null || when <= Date.now();
  }

  function applyCards() {
    document.querySelectorAll('[data-pb-publish]').forEach((node) => {
      const show = isDue(node.getAttribute('data-pb-publish'));
      node.hidden = !show;
      node.style.display = show ? '' : 'none';
    });
  }

  function applyArticlePage() {
    const meta = document.querySelector('meta[name="pb-publish"]');
    if (!meta) return;
    const content = document.getElementById('content');
    if (isDue(meta.getAttribute('content'))) {
      document.getElementById(HOLD_ID)?.remove();
      if (content) content.style.display = '';
      return;
    }
    if (content) content.style.display = 'none';
    if (document.getElementById(HOLD_ID)) return;
    const hold = document.createElement('div');
    hold.id = HOLD_ID;
    hold.style.cssText = 'font-family:system-ui,sans-serif;padding:3rem 1.5rem;max-width:36rem;margin:2rem auto';
    hold.innerHTML = '<h1>Belum tersedia</h1><p>Artikel ini dijadwalkan dan akan tampil otomatis pada waktunya.</p>';
    document.body.prepend(hold);
  }

  function arm() {
    const stamps = [];
    document.querySelectorAll('[data-pb-publish], meta[name="pb-publish"]').forEach((node) => {
      const iso = node.getAttribute('data-pb-publish') || node.getAttribute('content');
      const when = timeOf(iso);
      if (when !== null && when > Date.now()) stamps.push(when);
    });
    if (!stamps.length) return;
    const delay = Math.min(Math.min(...stamps) - Date.now() + 400, 2147483647);
    window.setTimeout(() => {
      applyCards();
      applyArticlePage();
      arm();
    }, delay);
  }

  function run() {
    applyCards();
    applyArticlePage();
    arm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
