const $ = id => document.getElementById(id);
const q = $('q'), results = $('results'), detail = $('detail');
const norm = s => (s ?? '').toString().toUpperCase().replace(/[^A-Z0-9\u0980-\u09FF]+/g, '');
const esc = s => (s ?? '').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const DEFAULT_IMAGE = 'images/no-image.svg';
let current = null, active = -1, currentMatches = [];

$('metaCount').textContent = `${window.INVENTORY_DATA.length} products`;

function stockClass(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 'good';
  if (n === 0) return 'zero';
  if (n <= 10) return 'low';
  return 'good';
}

function render() {
  const term = norm(q.value.trim());
  active = -1;
  if (!term) {
    results.style.display = 'none';
    detail.style.display = 'none';
    currentMatches = [];
    return;
  }
  currentMatches = window.INVENTORY_DATA
    .filter(x => norm(`${x.name} ${x.code} ${x.category}`).includes(term))
    .slice(0, 100);
  results.innerHTML = '';
  if (!currentMatches.length) {
    results.innerHTML = '<div class="empty">কোনো matching product পাওয়া যায়নি</div>';
  } else {
    currentMatches.forEach(x => {
      const el = document.createElement('div');
      el.className = 'result';
      el.innerHTML = `<div><div class="r-name">${esc(x.name || '-')}</div><div class="r-meta">${esc(x.category || '')}</div></div><div class="r-code">${esc(x.code || 'No code')}</div>`;
      el.onclick = () => show(x);
      results.appendChild(el);
    });
  }
  results.style.display = 'block';
}

function safeBase(value) {
  return (value ?? '').toString().trim().replace(/[\\/:*?"<>|#%]+/g, '-').replace(/\s+/g, ' ');
}
function slugBase(value) {
  return safeBase(value).toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]+/g, '-').replace(/^-+|-+$/g, '');
}
function imageCandidates(x) {
  const raw = [];
  if (x.code) raw.push(safeBase(x.code), slugBase(x.code));
  if (x.name) raw.push(safeBase(x.name), slugBase(x.name));
  const bases = [...new Set(raw.filter(Boolean))];
  const extensions = ['jpg', 'jpeg', 'png', 'webp', 'JPG', 'JPEG', 'PNG', 'WEBP'];
  return bases.flatMap(base => extensions.map(ext => `images/${encodeURIComponent(base)}.${ext}`));
}
function loadProductImage(x) {
  const img = $('dPhoto');
  const hint = $('photoHint');
  const candidates = imageCandidates(x);
  let i = 0;
  img.classList.add('is-loading');
  hint.textContent = 'ছবি খোঁজা হচ্ছে…';

  const tryNext = () => {
    if (i >= candidates.length) {
      img.onerror = null;
      img.onload = null;
      img.src = DEFAULT_IMAGE;
      img.dataset.full = DEFAULT_IMAGE;
      img.classList.remove('is-loading');
      hint.textContent = 'এই প্রোডাক্টের ছবি এখনো যোগ করা হয়নি';
      return;
    }
    const next = candidates[i++];
    img.onload = () => {
      img.classList.remove('is-loading');
      img.dataset.full = next;
      hint.textContent = 'ছবিতে চাপলে বড় করে দেখা যাবে';
      img.onload = null;
      img.onerror = null;
    };
    img.onerror = tryNext;
    img.src = next;
  };
  tryNext();
}

function show(x) {
  current = x;
  $('dName').textContent = x.name || '-';
  $('dCode').textContent = x.code || '-';
  $('dCategory').textContent = x.category || '-';
  $('dSize').textContent = x.size || '-';
  $('dUnit').textContent = x.unit || '-';
  $('dStock').textContent = (x.stock === '' || x.stock == null) ? 'Not updated' : x.stock;
  $('dStock').className = `value stock ${stockClass(x.stock)}`;
  $('dPrice').textContent = (x.price === '' || x.price == null) ? '-' : x.price;
  $('dRemarks').textContent = x.remarks || '-';
  $('dLocation').textContent = x.location || 'Hamayetpur Warehouse';
  loadProductImage(x);
  detail.style.display = 'block';
  results.style.display = 'none';
  q.value = x.code || x.name;
  detail.scrollIntoView({behavior:'smooth', block:'start'});
}

function move(step) {
  const els = [...document.querySelectorAll('.result')];
  if (!els.length) return;
  active = Math.max(0, Math.min(els.length - 1, active + step));
  els.forEach((el, i) => el.classList.toggle('active', i === active));
  els[active].scrollIntoView({block:'nearest'});
}

q.addEventListener('input', render);
q.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
  if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
  if (e.key === 'Enter' && active >= 0) { e.preventDefault(); show(currentMatches[active]); }
  if (e.key === 'Escape') clearAll();
});

$('clearBtn').onclick = clearAll;
function clearAll() {
  q.value = '';
  results.style.display = 'none';
  detail.style.display = 'none';
  current = null;
  closeImageModal();
  q.focus();
}

$('copyBtn').onclick = async () => {
  if (!current) return;
  const text = `${current.name}\nCode: ${current.code || '-'}\nCategory: ${current.category || '-'}\nSize: ${current.size || '-'}\nUnit: ${current.unit || '-'}\nStock: ${current.stock || 0}\nLocation: ${current.location || 'Hamayetpur Warehouse'}`;
  await navigator.clipboard.writeText(text);
  $('copyBtn').textContent = 'Copied';
  setTimeout(() => $('copyBtn').textContent = 'Copy', 1200);
};

function openImageModal() {
  if (!current) return;
  $('modalImage').src = $('dPhoto').dataset.full || $('dPhoto').src;
  $('modalCaption').textContent = `${current.name || ''}${current.code ? ` • ${current.code}` : ''}`;
  $('imageModal').classList.add('open');
  $('imageModal').setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}
function closeImageModal() {
  $('imageModal').classList.remove('open');
  $('imageModal').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}
$('photoBtn').onclick = openImageModal;
$('modalClose').onclick = closeImageModal;
$('imageModal').onclick = e => { if (e.target === $('imageModal')) closeImageModal(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeImageModal(); });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.unregister());
  });
}
