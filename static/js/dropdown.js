/* ==========================================================================
   FILE: static/js/dropdown.js
   PURPOSE: Bulletproof explicit logic for navigation dropdowns
   ========================================================================== */

// 1. Direct function called explicitly by the Tools button HTML
window.toggleNavDropdown = function(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const toggleBtn = event.currentTarget;
    const menu = toggleBtn.nextElementSibling;
    const isShowing = menu.classList.contains('show');

    // Close any other open menus first
    document.querySelectorAll('.nav-dropdown-menu.show').forEach(m => {
        m.classList.remove('show');
        if(m.previousElementSibling) m.previousElementSibling.setAttribute('aria-expanded', 'false');
    });

    // Toggle the clicked menu
    if (!isShowing) {
        menu.classList.add('show');
        toggleBtn.setAttribute('aria-expanded', 'true');
    } else {
        menu.classList.remove('show');
        toggleBtn.setAttribute('aria-expanded', 'false');
    }
};

// 2. Global listener to close the dropdown if the user clicks anywhere else
document.addEventListener('click', function(event) {
    if (!event.target.closest('.nav-dropdown')) {
        document.querySelectorAll('.nav-dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
            if(menu.previousElementSibling) menu.previousElementSibling.setAttribute('aria-expanded', 'false');
        });
    }
});

// 3. Accessibility: Close when pressing Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.nav-dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
            if(menu.previousElementSibling) menu.previousElementSibling.setAttribute('aria-expanded', 'false');
        });
    }
});