// ============================================
// Braj Awadhi Kavyalok — Nav Dropdown (Tools menu)
// ============================================

(function () {
  const toggle = document.querySelector('.nav-dropdown-toggle');
  const menu   = document.querySelector('.nav-dropdown-menu');

  if (!toggle || !menu) return;

  // Toggle dropdown on button click
  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    const isOpen = menu.classList.contains('is-open');
    closeMenu();
    if (!isOpen) openMenu();
  });

  // Close menu when clicking anywhere outside
  document.addEventListener('click', function () {
    closeMenu();
  });

  // Close menu on Escape key press
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  // Keyboard accessibility: allow arrow-key navigation inside menu
  menu.addEventListener('keydown', function (e) {
    const items = Array.from(menu.querySelectorAll('a'));
    const idx   = items.indexOf(document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1) % items.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length].focus();
    }
  });

  function openMenu() {
    menu.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    // Focus first item for keyboard users
    const first = menu.querySelector('a');
    if (first) first.focus();
  }

  function closeMenu() {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }
})();