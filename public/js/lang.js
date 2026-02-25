// ============================================
// Braj Kavya — Language Switcher
// ============================================

const LANG_KEY = 'braj_lang';

function getLang() {
  return localStorage.getItem(LANG_KEY) || 'hi';
}

function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.setAttribute('data-lang', lang);
  updateToggleButton(lang);
}

function toggleLang() {
  setLang(getLang() === 'hi' ? 'en' : 'hi');
}

function updateToggleButton(lang) {
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = lang === 'hi' ? 'English' : 'हिंदी';
}

// Apply immediately on load
document.addEventListener('DOMContentLoaded', () => {
  const lang = getLang();
  document.documentElement.setAttribute('data-lang', lang);
  updateToggleButton(lang);
});