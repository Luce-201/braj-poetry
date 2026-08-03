// ============================================
// Braj Awadhi Kavyalok — Auth Engine (Supabase)
// ============================================
(function () {
    // --- Supabase Credentials ---
    const SUPABASE_URL = 'https://sktwptunwlnhntwmglvw.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_w6u93KdBShe57XH0O2825g_l6RhjFz-';

    if (!window.supabase) {
        console.error('Supabase SDK missing. Ensure script tag is in baseof.html');
        return;
    }

    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.BRAJ_SUPABASE = sb;
    let currentUser = null;

    // Helper to grab elements
    function $(id) { return document.getElementById(id); }

    // ── MODAL LOGIC ───────────────────────────────────────────────────────────
    function openModal() {
        const overlay = $('auth-modal-overlay');
        if (!overlay) return;
        
        // Remove the hidden class to show the modal
        overlay.classList.remove('auth-modal-hidden');

        // Clear out any old messages or inputs
        const msg = $('auth-message');
        const emailInput = $('auth-email-input');
        if (msg) { msg.textContent = ''; msg.style.color = ''; }
        if (emailInput) emailInput.value = '';
    }

    function closeModal() {
        const overlay = $('auth-modal-overlay');
        if (overlay) {
            // Add the hidden class back to hide the modal
            overlay.classList.add('auth-modal-hidden');
        }
    }

    // ── UI UPDATES ────────────────────────────────────────────────────────────
    function updateAuthUI() {
        const loginBtn = $('auth-login-btn');
        const logoutBtn = $('auth-logout-btn');
        
        if (currentUser) {
            // User is logged in: Hide Sign In, Show Sign Out
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
        } else {
            // User is logged out: Show Sign In, Hide Sign Out
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    }

    // ── AUTH STATE MANAGEMENT ─────────────────────────────────────────────────
    function onSignedIn(user) {
        currentUser = user;
        updateAuthUI();
        closeModal(); // Automatically close modal upon successful login
    }

    function onSignedOut() {
        currentUser = null;
        updateAuthUI();
    }

    async function init() {
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user) onSignedIn(session.user);
        else onSignedOut();

        // Listen for login/logout events happening in other tabs
        sb.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user) onSignedIn(session.user);
            } else if (event === 'SIGNED_OUT') {
                onSignedOut();
            }
        });
    }

    // ── SIGN IN METHODS ───────────────────────────────────────────────────────
    async function signInWithGoogle() {
        const { error } = await sb.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) {
            const msg = $('auth-message');
            if (msg) { 
                msg.textContent = 'Error connecting to Google.'; 
                msg.style.color = '#c0392b'; 
            }
        }
    }

    async function signInWithEmail() {
        const emailInput = $('auth-email-input');
        const emailBtn = $('auth-email-btn');
        const msg = $('auth-message');
        const email = emailInput?.value?.trim();

        if (!email) {
            if (msg) { 
                msg.textContent = 'Please enter a valid email address.'; 
                msg.style.color = '#c0392b'; 
            }
            return;
        }

        if (emailBtn) emailBtn.disabled = true;
        if (msg) { 
            msg.textContent = 'Sending magic link...'; 
            msg.style.color = 'inherit'; 
        }

        const { error } = await sb.auth.signInWithOtp({
            email: email,
            options: { emailRedirectTo: window.location.origin }
        });

        if (emailBtn) emailBtn.disabled = false;

        if (error) {
            if (msg) { 
                msg.textContent = error.message; 
                msg.style.color = '#c0392b'; 
            }
        } else {
            if (msg) { 
                msg.textContent = 'Magic link sent! Check your inbox.'; 
                msg.style.color = '#4CAF50'; 
            }
            if (emailInput) emailInput.value = '';
        }
    }

    async function signOut() {
        await sb.auth.signOut();
    }

    // ── EVENT LISTENERS ───────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        const loginBtn = $('auth-login-btn');
        const closeBtn = $('auth-modal-close');
        const overlay = $('auth-modal-overlay');
        const googleBtn = $('auth-google-btn');
        const emailBtn = $('auth-email-btn');
        const logoutBtn = $('auth-logout-btn');

        // Wire up clicks to our functions
        if (loginBtn) loginBtn.addEventListener('click', openModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (googleBtn) googleBtn.addEventListener('click', signInWithGoogle);
        if (emailBtn) emailBtn.addEventListener('click', signInWithEmail);
        if (logoutBtn) logoutBtn.addEventListener('click', signOut);

        // Allow closing the modal by clicking the dark background outside the box
        if (overlay) {
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) closeModal();
            });
        }

        // Initialize user session on load
        init();
    });

    // ── PUBLIC API (Used by favourite.js) ─────────────────────────────────────
    window.BrajAuth = {
        getClient: () => sb,
        getUser: () => currentUser,
        openModal,
        getFavourites: async () => {
            if (!currentUser) return [];
            const { data } = await sb.from('favourites')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });
            return data || [];
        }
    };

})();