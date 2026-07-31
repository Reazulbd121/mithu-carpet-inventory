const $ = id => document.getElementById(id);
const q = $('q'), results = $('results'), detail = $('detail');
const norm = s => (s ?? '').toString().toUpperCase().replace(/[^A-Z0-9\u0980-\u09FF]+/g, '');
const esc = s => (s ?? '').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const DEFAULT_IMAGE = 'images/no-image.svg';
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'JPG', 'JPEG', 'PNG', 'WEBP'];
const MAX_NUMBERED_IMAGES = 30;
let current = null, active = -1, currentMatches = [];
let currentImages = [], currentImageIndex = 0, imageLoadToken = 0;

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
function productBases(x) {
  const raw = [];
  if (x.code) raw.push(safeBase(x.code), slugBase(x.code));
  if (x.name) raw.push(safeBase(x.name), slugBase(x.name));
  return [...new Set(raw.filter(Boolean))];
}
function encodePathPart(value) {
  return encodeURIComponent(value).replace(/%2F/gi, '-');
}
function singleImageCandidates(x) {
  const candidates = [];
  productBases(x).forEach(base => {
    const encoded = encodePathPart(base);
    IMAGE_EXTENSIONS.forEach(ext => candidates.push(`images/${encoded}.${ext}`));
  });
  return [...new Set(candidates)];
}
function numberedImageCandidates(base, number, folderMode = false) {
  const encoded = encodePathPart(base);
  return IMAGE_EXTENSIONS.map(ext => folderMode
    ? `images/${encoded}/${number}.${ext}`
    : `images/${encoded}-${number}.${ext}`
  );
}
function testImage(url) {
  return new Promise(resolve => {
    const probe = new Image();
    probe.onload = () => resolve(url);
    probe.onerror = () => resolve(null);
    probe.src = url;
  });
}
async function firstWorkingImage(candidates, token) {
  if (token !== imageLoadToken) return null;
  const checked = await Promise.all(candidates.map(testImage));
  return checked.find(Boolean) || null;
}
async function findNumberedSeries(base, folderMode, token) {
  const found = [];
  let consecutiveMisses = 0;
  for (let n = 1; n <= MAX_NUMBERED_IMAGES && consecutiveMisses < 2; n++) {
    if (token !== imageLoadToken) return [];
    const image = await firstWorkingImage(numberedImageCandidates(base, n, folderMode), token);
    if (image) {
      found.push(image);
      consecutiveMisses = 0;
    } else {
      consecutiveMisses++;
    }
  }
  return found;
}
async function findProductImages(x, token) {
  const found = [];

  // পুরোনো single-image নিয়ম আগে দেখা হয়।
  const legacyChecks = await Promise.all(singleImageCandidates(x).map(testImage));
  legacyChecks.forEach(url => { if (url && !found.includes(url)) found.push(url); });
  if (token !== imageLoadToken) return [];

  // নতুন numbered ও folder নিয়ম। দুইটি ধারাবাহিক নম্বর না পাওয়া গেলে search থামে।
  for (const base of productBases(x)) {
    const numbered = await findNumberedSeries(base, false, token);
    numbered.forEach(url => { if (!found.includes(url)) found.push(url); });
    const folder = await findNumberedSeries(base, true, token);
    folder.forEach(url => { if (!found.includes(url)) found.push(url); });
    if (token !== imageLoadToken) return [];
  }
  return found;
}
function setMainImage(index, openModal = false) {
  if (!currentImages.length) return;
  currentImageIndex = (index + currentImages.length) % currentImages.length;
  const src = currentImages[currentImageIndex];
  const img = $('dPhoto');
  img.src = src;
  img.dataset.full = src;
  updateGalleryUI();
  if (openModal) updateModalImage();
}
function updateGalleryUI() {
  const count = currentImages.length;
  const gallery = $('photoGallery');
  const counter = $('photoCounter');
  const prev = $('photoPrev');
  const next = $('photoNext');
  const thumbs = $('photoThumbs');

  gallery.style.display = count ? 'block' : 'none';
  counter.textContent = count > 1 ? `${currentImageIndex + 1} / ${count} Designs` : (count === 1 ? '1 Design' : '');
  prev.style.display = count > 1 ? 'block' : 'none';
  next.style.display = count > 1 ? 'block' : 'none';
  thumbs.style.display = count > 1 ? 'flex' : 'none';
  thumbs.innerHTML = '';

  if (count > 1) {
    currentImages.forEach((src, index) => {
      const button = document.createElement('button');
      button.className = `photo-thumb${index === currentImageIndex ? ' active' : ''}`;
      button.type = 'button';
      button.setAttribute('aria-label', `Design ${index + 1}`);
      button.innerHTML = `<img src="${src}" alt="Design ${index + 1}" loading="lazy">`;
      button.onclick = () => setMainImage(index);
      thumbs.appendChild(button);
    });
    const activeThumb = thumbs.children[currentImageIndex];
    if (activeThumb) activeThumb.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
}
async function loadProductImages(x) {
  const token = ++imageLoadToken;
  const img = $('dPhoto');
  const hint = $('photoHint');
  currentImages = [];
  currentImageIndex = 0;
  updateGalleryUI();
  img.classList.add('is-loading');
  img.src = DEFAULT_IMAGE;
  img.dataset.full = DEFAULT_IMAGE;
  hint.textContent = 'ছবি খোঁজা হচ্ছে…';

  const images = await findProductImages(x, token);
  if (token !== imageLoadToken) return;

  img.classList.remove('is-loading');
  if (!images.length) {
    currentImages = [DEFAULT_IMAGE];
    currentImageIndex = 0;
    img.src = DEFAULT_IMAGE;
    img.dataset.full = DEFAULT_IMAGE;
    hint.textContent = 'এই প্রোডাক্টের ছবি এখনো যোগ করা হয়নি';
    updateGalleryUI();
    return;
  }

  currentImages = images;
  setMainImage(0);
  hint.textContent = images.length > 1
    ? `এই কোডে ${images.length}টি ডিজাইন পাওয়া গেছে — ছবিতে চাপলে বড় হবে`
    : 'ছবিতে চাপলে বড় করে দেখা যাবে';
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
  loadProductImages(x);
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
  currentImages = [];
  imageLoadToken++;
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

function updateModalImage() {
  const src = currentImages[currentImageIndex] || $('dPhoto').dataset.full || $('dPhoto').src;
  $('modalImage').src = src;
  const suffix = currentImages.length > 1 ? ` • ${currentImageIndex + 1}/${currentImages.length}` : '';
  $('modalCaption').textContent = `${current.name || ''}${current.code ? ` • ${current.code}` : ''}${suffix}`;
  $('modalPrev').style.display = currentImages.length > 1 ? 'block' : 'none';
  $('modalNext').style.display = currentImages.length > 1 ? 'block' : 'none';
}
function openImageModal() {
  if (!current) return;
  updateModalImage();
  $('imageModal').classList.add('open');
  $('imageModal').setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}
function closeImageModal() {
  $('imageModal').classList.remove('open');
  $('imageModal').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}
function changeGalleryImage(step, modal = false) {
  if (currentImages.length <= 1) return;
  setMainImage(currentImageIndex + step, modal);
}
$('photoBtn').onclick = openImageModal;
$('photoPrev').onclick = () => changeGalleryImage(-1);
$('photoNext').onclick = () => changeGalleryImage(1);
$('modalPrev').onclick = e => { e.stopPropagation(); changeGalleryImage(-1, true); };
$('modalNext').onclick = e => { e.stopPropagation(); changeGalleryImage(1, true); };
$('modalClose').onclick = closeImageModal;
$('imageModal').onclick = e => { if (e.target === $('imageModal')) closeImageModal(); };
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeImageModal();
  if ($('imageModal').classList.contains('open') && e.key === 'ArrowLeft') changeGalleryImage(-1, true);
  if ($('imageModal').classList.contains('open') && e.key === 'ArrowRight') changeGalleryImage(1, true);
});

// পুরোনো Service Worker/Cache সরিয়ে রাখা হয়েছে, যাতে data.js-এর In/Out update আটকে না যায়।
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.unregister());
  });
  if ('caches' in window) {
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))));
  }
}
