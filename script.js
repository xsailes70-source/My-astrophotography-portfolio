const gallery = document.getElementById('photo-gallery');
const filterButtons = document.querySelectorAll('.filter-btn');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxTitle = document.getElementById('lightbox-title');
const lightboxMetadata = document.getElementById('lightbox-metadata');
const closeLightbox = document.querySelector('.close-lightbox');
const langToggleBtn = document.getElementById('lang-toggle');
const supabaseUrl = 'https://docwljemzdmvtxqyurks.supabase.co';
const supabaseKey = 'sb_publishable_diIew3INCNF3hc9Cqudo6Q_2N0uSIgp';
let currentLang = 'el';
let activeFilter = 'all';
let lastTrigger;
let photos = [];
const ratingData = new Map();
const ratedPhotoIds = new Set(JSON.parse(localStorage.getItem('skylover-rated-photos') || '[]'));

const categoryNames = {
  deepsky: { el: 'Βαθύ Σύμπαν', en: 'Deep Sky' },
  solar: { el: 'Ηλιακό Σύστημα', en: 'Solar System' },
  landscape: { el: 'Astro-landscape', en: 'Astro-landscape' },
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function valueFor(photo, field) {
  return photo[`${field}_${currentLang}`] || photo[`${field}_el`] || photo[field] || '';
}

function detail(labelEl, labelEn, value) {
  if (!value) return '';
  return `<div><dt data-el="${labelEl}" data-en="${labelEn}">${labelEl}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function cdnImage(image, width, height, quality = 82) {
  return `/.netlify/images?url=${encodeURIComponent(image)}&w=${width}&h=${height}&fit=cover&fm=webp&q=${quality}`;
}

function lightboxImage(image) {
  return `/.netlify/images?url=${encodeURIComponent(image)}&w=1800&fm=webp&q=86`;
}

function formatExposure(seconds) {
  if (!seconds) return '';
  if (seconds >= 1) return `${Number(seconds.toFixed(2))}s`;
  return `1/${Math.round(1 / seconds)}s`;
}

function exifItem(label, value) {
  return value ? `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>` : '';
}

function ratingId(photo) {
  return photo.rating_id || photo.image;
}

function ratingMarkup(photo) {
  const id = ratingId(photo);
  const data = ratingData.get(id);
  const average = data ? Number(data.average_rating) : 0;
  const count = data ? Number(data.vote_count) : 0;
  const summary = count
    ? `${average.toFixed(1)} / 5 · ${count} ${currentLang === 'el' ? (count === 1 ? 'ψήφος' : 'ψήφοι') : (count === 1 ? 'vote' : 'votes')}`
    : (currentLang === 'el' ? 'Δεν υπάρχουν ψήφοι ακόμη' : 'No votes yet');
  const label = currentLang === 'el' ? 'Βαθμολόγησε αυτή τη φωτογραφία' : 'Rate this photo';
  return `<div class="rating" data-rating-id="${escapeHtml(id)}"><div class="rating-stars" role="group" aria-label="${label}">${[1, 2, 3, 4, 5].map((value) => `<button class="rating-star ${value <= Math.round(average) ? 'is-filled' : ''}" type="button" data-value="${value}" aria-label="${value} ${currentLang === 'el' ? 'αστέρια' : 'stars'}">★</button>`).join('')}</div><span class="rating-summary">${summary}</span></div>`;
}

async function showExif(image) {
  lightboxMetadata.hidden = true;
  lightboxMetadata.innerHTML = '';
  if (!window.exifr || !/\.(jpe?g|tiff?)$/i.test(image)) return;
  try {
    const exif = await window.exifr.parse(image, ['ISO', 'ExposureTime', 'DateTimeOriginal', 'Model', 'LensModel']);
    if (!exif) return;
    const date = exif.DateTimeOriginal instanceof Date
      ? exif.DateTimeOriginal.toLocaleDateString(currentLang === 'el' ? 'el-GR' : 'en-GB')
      : '';
    const items = [
      exifItem(currentLang === 'el' ? 'Ημερομηνία' : 'Date', date),
      exifItem('ISO', exif.ISO ? `ISO ${exif.ISO}` : ''),
      exifItem(currentLang === 'el' ? 'Έκθεση' : 'Exposure', formatExposure(exif.ExposureTime)),
      exifItem(currentLang === 'el' ? 'Κάμερα' : 'Camera', exif.Model),
      exifItem(currentLang === 'el' ? 'Φακός' : 'Lens', exif.LensModel),
    ].filter(Boolean).join('');
    if (items) {
      lightboxMetadata.innerHTML = items;
      lightboxMetadata.hidden = false;
    }
  } catch (_) {
    // Metadata is optional and some processed files do not include it.
  }
}

function renderPhotos() {
  const visiblePhotos = photos.filter((photo) => activeFilter === 'all' || photo.category === activeFilter);
  gallery.innerHTML = visiblePhotos.map((photo) => {
    const title = valueFor(photo, 'title');
    const description = valueFor(photo, 'description');
    const category = categoryNames[photo.category] || categoryNames.deepsky;
    const image = photo.image || '';
    const smallImage = cdnImage(image, 480, 320);
    const largeImage = cdnImage(image, 720, 480);
    return `<article class="card" data-category="${escapeHtml(photo.category)}">
      <button class="image-trigger" type="button" data-image="${escapeHtml(image)}" data-title="${escapeHtml(title)}" aria-label="Μεγέθυνση φωτογραφίας ${escapeHtml(title)}">
        <img src="${escapeHtml(largeImage)}" srcset="${escapeHtml(smallImage)} 480w, ${escapeHtml(largeImage)} 720w" sizes="(max-width: 560px) 100vw, (max-width: 800px) 50vw, 360px" alt="${escapeHtml(title)}" loading="lazy">
        <span class="image-hint" data-el="Προβολή πλήρους εικόνας" data-en="View full image">${currentLang === 'el' ? 'Προβολή πλήρους εικόνας' : 'View full image'}</span>
      </button>
      <div class="card-info"><p class="category">${currentLang === 'el' ? category.el : category.en}</p><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p>
        ${ratingMarkup(photo)}<dl class="shot-details">${detail('Στόχος', 'Target', photo.target)}${detail('Τοποθεσία', 'Location', photo.location)}${detail('Εξοπλισμός', 'Gear', photo.gear)}${detail('Ημερομηνία', 'Date', photo.capture_date)}${detail('Έκθεση', 'Exposure', photo.exposure)}${detail('ISO', 'ISO', photo.iso)}${detail('Frames', 'Frames', photo.frames)}${detail('Επεξεργασία', 'Processing', photo.processing)}</dl>
      </div></article>`;
  }).join('');
}

async function loadPhotos() {
  try {
    const response = await fetch('content/photos.json');
    if (!response.ok) throw new Error('Could not load photo data');
    const data = await response.json();
    photos = data.photos || [];
    renderPhotos();
  } catch (error) {
    gallery.innerHTML = '<p class="form-note">Δεν ήταν δυνατή η φόρτωση των φωτογραφιών.</p>';
  }
}

async function loadRatings() {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_photo_ratings`, { method: 'POST', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' }, body: '{}' });
    if (!response.ok) throw new Error('Could not load ratings');
    (await response.json()).forEach((row) => ratingData.set(row.photo_id, row));
    renderPhotos();
  } catch (_) {
    // Ratings are optional: the portfolio continues to work if the service is unavailable.
  }
}

async function submitRating(id, rating, container) {
  const message = (text) => { let item = container.querySelector('.rating-message'); if (!item) { item = document.createElement('span'); item.className = 'rating-message'; container.append(item); } item.textContent = text; };
  if (ratedPhotoIds.has(id)) { message(currentLang === 'el' ? 'Έχεις ήδη βαθμολογήσει αυτή τη φωτογραφία.' : 'You have already rated this photo.'); return; }
  const key = 'skylover-visitor-id';
  let visitorId = localStorage.getItem(key);
  if (!visitorId) { visitorId = crypto.randomUUID(); localStorage.setItem(key, visitorId); }
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/photo_ratings`, { method: 'POST', headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ photo_id: id, visitor_id: visitorId, rating }) });
    if (!response.ok) throw new Error('Could not submit rating');
    ratedPhotoIds.add(id);
    localStorage.setItem('skylover-rated-photos', JSON.stringify([...ratedPhotoIds]));
    const data = ratingData.get(id) || { average_rating: 0, vote_count: 0 };
    const count = Number(data.vote_count) + 1;
    ratingData.set(id, { photo_id: id, vote_count: count, average_rating: ((Number(data.average_rating) * (count - 1) + rating) / count) });
    renderPhotos();
  } catch (_) { message(currentLang === 'el' ? 'Η ψήφος δεν καταχωρήθηκε. Δοκίμασε ξανά.' : 'Your rating was not saved. Please try again.'); }
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    activeFilter = button.dataset.filter;
    loadPhotos();
  });
});

function closeModal() {
  lightbox.hidden = true;
  lightboxImg.src = '';
  lastTrigger?.focus();
}

gallery.addEventListener('click', (event) => {
  const star = event.target.closest('.rating-star');
  if (star) { submitRating(star.closest('.rating').dataset.ratingId, Number(star.dataset.value), star.closest('.rating')); return; }
  const trigger = event.target.closest('.image-trigger');
  if (!trigger) return;
  lastTrigger = trigger;
  lightboxImg.src = lightboxImage(trigger.dataset.image);
  lightboxImg.alt = trigger.dataset.title;
  lightboxTitle.textContent = trigger.dataset.title;
  lightbox.hidden = false;
  showExif(trigger.dataset.image);
  closeLightbox.focus();
});
closeLightbox.addEventListener('click', closeModal);
lightbox.addEventListener('click', (event) => { if (event.target === lightbox) closeModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !lightbox.hidden) closeModal(); });

langToggleBtn.addEventListener('click', () => {
  currentLang = currentLang === 'el' ? 'en' : 'el';
  document.documentElement.lang = currentLang;
  langToggleBtn.textContent = currentLang === 'el' ? 'EN' : 'GR';
  document.querySelectorAll('[data-el][data-en]').forEach((element) => { element.textContent = element.dataset[currentLang]; });
  loadPhotos();
});

document.getElementById('year').textContent = new Date().getFullYear();
loadPhotos();
loadRatings();
