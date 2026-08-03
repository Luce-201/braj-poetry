document.addEventListener('DOMContentLoaded', function () {
  const dropdownBtn = document.getElementById('tools-dropdown-btn');
  const dropdownMenu = document.getElementById('tools-dropdown-menu');

  if (!dropdownBtn || !dropdownMenu) return;

  // Toggle on click
  dropdownBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    const isExpanded = dropdownBtn.getAttribute('aria-expanded') === 'true';

    if (isExpanded) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  // Close when clicking outside
  document.addEventListener('click', function (event) {
    if (!dropdownBtn.contains(event.target) && !dropdownMenu.contains(event.target)) {
      closeDropdown();
    }
  });

  // Close when pressing Escape key
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeDropdown();
    }
  });

  function openDropdown() {
    dropdownMenu.classList.add('show');
    dropdownBtn.setAttribute('aria-expanded', 'true');
  }

  function closeDropdown() {
    dropdownMenu.classList.remove('show');
    dropdownBtn.setAttribute('aria-expanded', 'false');
  }
});