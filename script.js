const gallery = document.getElementById('photo-gallery');
const filterButtons = document.querySelectorAll('.filter-btn');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxTitle = document.getElementById('lightbox-title');
const lightboxMetadata = document.getElementById('lightbox-metadata');
const closeLightbox = document.querySelector('.close-lightbox');
const langToggleBtn = document.getElementById('lang-toggle');
let currentLang = 'el';
let activeFilter = 'all';
let lastTrigger;

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

function renderPhotos(photos) {
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
        <dl class="shot-details">${detail('Στόχος', 'Target', photo.target)}${detail('Τοποθεσία', 'Location', photo.location)}${detail('Εξοπλισμός', 'Gear', photo.gear)}${detail('Ημερομηνία', 'Date', photo.capture_date)}${detail('Έκθεση', 'Exposure', photo.exposure)}${detail('ISO', 'ISO', photo.iso)}${detail('Frames', 'Frames', photo.frames)}${detail('Επεξεργασία', 'Processing', photo.processing)}</dl>
      </div></article>`;
  }).join('');
}

async function loadPhotos() {
  try {
    const response = await fetch('content/photos.json');
    if (!response.ok) throw new Error('Could not load photo data');
    const data = await response.json();
    renderPhotos(data.photos || []);
  } catch (error) {
    gallery.innerHTML = '<p class="form-note">Δεν ήταν δυνατή η φόρτωση των φωτογραφιών.</p>';
  }
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
