/* ==========================================================================
   FILE: static/js/dropdown.js
   PURPOSE: Universal logic for opening/closing all navigation dropdowns
   ========================================================================== */

document.addEventListener('click', function(event) {
    // 1. Check if the user clicked a dropdown toggle button
    const toggle = event.target.closest('.nav-dropdown-toggle');
    
    // 2. If they clicked outside of ANY dropdown, close them all safely
    if (!toggle) {
        document.querySelectorAll('.nav-dropdown-menu.show').forEach(menu => {
            // Only close it if they didn't click inside the open menu itself
            if (!menu.contains(event.target)) {
                menu.classList.remove('show');
                if (menu.previousElementSibling) {
                    menu.previousElementSibling.setAttribute('aria-expanded', 'false');
                }
            }
        });
        return;
    }

    // 3. If they DID click a toggle button, execute the toggle logic
    event.preventDefault();
    event.stopPropagation();
    
    const menu = toggle.nextElementSibling;
    const isExpanded = toggle.getAttribute('aria-expanded') === 'true';

    // First, close any OTHER open dropdowns on the page
    document.querySelectorAll('.nav-dropdown-menu.show').forEach(m => {
        if (m !== menu) {
            m.classList.remove('show');
            if (m.previousElementSibling) {
                m.previousElementSibling.setAttribute('aria-expanded', 'false');
            }
        }
    });

    // Then toggle the targeted menu
    if (!isExpanded && menu) {
        menu.classList.add('show');
        toggle.setAttribute('aria-expanded', 'true');
    } else if (menu) {
        menu.classList.remove('show');
        toggle.setAttribute('aria-expanded', 'false');
    }
});

// 4. Accessibility: Close any open dropdowns when pressing the Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.nav-dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
            if (menu.previousElementSibling) {
                menu.previousElementSibling.setAttribute('aria-expanded', 'false');
            }
        });
    }
});