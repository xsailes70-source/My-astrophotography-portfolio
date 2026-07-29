const filterButtons = document.querySelectorAll('.filter-btn');
const cards = document.querySelectorAll('.card');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const filter = button.dataset.filter;
    cards.forEach((card) => {
      const visible = filter === 'all' || card.dataset.category === filter;
      card.hidden = !visible;
    });
  });
});

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxTitle = document.getElementById('lightbox-title');
const closeLightbox = document.querySelector('.close-lightbox');
let lastTrigger;

function closeModal() {
  lightbox.hidden = true;
  lightboxImg.src = '';
  lastTrigger?.focus();
}

document.querySelectorAll('.image-trigger').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    lastTrigger = trigger;
    lightboxImg.src = trigger.dataset.image;
    lightboxImg.alt = trigger.querySelector('img').alt;
    lightboxTitle.textContent = trigger.dataset[`title${currentLang === 'el' ? 'El' : 'En'}`];
    lightbox.hidden = false;
    closeLightbox.focus();
  });
});
closeLightbox.addEventListener('click', closeModal);
lightbox.addEventListener('click', (event) => { if (event.target === lightbox) closeModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !lightbox.hidden) closeModal(); });

const langToggleBtn = document.getElementById('lang-toggle');
let currentLang = 'el';
langToggleBtn.addEventListener('click', () => {
  currentLang = currentLang === 'el' ? 'en' : 'el';
  document.documentElement.lang = currentLang;
  langToggleBtn.textContent = currentLang === 'el' ? 'EN' : 'GR';
  document.querySelectorAll('[data-el][data-en]').forEach((element) => {
    element.textContent = element.dataset[currentLang];
  });
  if (!lightbox.hidden && lastTrigger) {
    lightboxTitle.textContent = lastTrigger.dataset[`title${currentLang === 'el' ? 'El' : 'En'}`];
  }
});

document.getElementById('year').textContent = new Date().getFullYear();
