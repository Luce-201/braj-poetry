// ============================================
// Braj Awadhi Kavyalok — Auth & Favourites
// Powered by Supabase
// ============================================

(function () {

  const SUPABASE_URL = 'https://xftdcucvvgawcozowyew.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_S9uqhD-0Y700NX-mXK9vpA_Cnjm9XFQ';

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  let currentUser    = null;
  let userFavourites = new Set(); // stores item_url strings

  function $(id) { return document.getElementById(id); }

  // ── INITIALISE ────────────────────────────────────────────────────────────
  async function init() {
    // Check for an existing login session
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) await onSignedIn(session.user);
    else               onSignedOut();

    // Listen for login / logout events (including OAuth redirect return)
    sb.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) await onSignedIn(session.user);
      else               onSignedOut();
    });
  }

  // ── SIGNED IN ─────────────────────────────────────────────────────────────
  async function onSignedIn(user) {
    currentUser = user;

    // Work out a display name and initial
    const name    = user.user_metadata?.full_name
                 || user.user_metadata?.name
                 || user.email?.split('@')[0]
                 || 'User';
    const initial = name.charAt(0).toUpperCase();

    // Update header UI
    const nameEl   = $('auth-user-name');
    const avatarEl = $('auth-user-avatar');
    const loginBtn = $('auth-login-btn');
    const userMenu = $('auth-user-menu');

    if (nameEl)   nameEl.textContent   = name;
    if (avatarEl) avatarEl.textContent = initial;
    if (loginBtn) loginBtn.style.display = 'none';
    if (userMenu) userMenu.style.display = 'flex';

    // Load favourites then refresh all heart buttons on the page
    await loadFavourites();
    updateFavBtns();
    closeModal();
  }

  // ── SIGNED OUT ────────────────────────────────────────────────────────────
  function onSignedOut() {
    currentUser = null;
    userFavourites.clear();

    const loginBtn = $('auth-login-btn');
    const userMenu = $('auth-user-menu');
    if (loginBtn) loginBtn.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';

    updateFavBtns();
  }

  // ── LOAD FAVOURITES FROM DATABASE ─────────────────────────────────────────
  async function loadFavourites() {
    if (!currentUser) return;
    const { data, error } = await sb
      .from('favourites')
      .select('item_url')
      .eq('user_id', currentUser.id);
    if (!error && data) {
      userFavourites = new Set(data.map(r => r.item_url));
    }
  }

  // ── TOGGLE A FAVOURITE (add or remove) ───────────────────────────────────
  async function toggleFavourite(url, title, type) {
    // Not logged in — open the login modal instead
    if (!currentUser) { openModal(); return; }

    if (userFavourites.has(url)) {
      // Already a favourite — remove it
      await sb.from('favourites')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('item_url', url);
      userFavourites.delete(url);
    } else {
      // Add as favourite
      await sb.from('favourites').insert({
        user_id:    currentUser.id,
        item_url:   url,
        item_title: title,
        item_type:  type,
      });
      userFavourites.add(url);
    }

    updateFavBtns();
  }

  // ── UPDATE ALL HEART BUTTONS ON THE PAGE ─────────────────────────────────
  function updateFavBtns() {
    document.querySelectorAll('.fav-btn').forEach(btn => {
      const isFav = userFavourites.has(btn.dataset.url);
      btn.classList.toggle('is-fav', isFav);
      btn.title = isFav
        ? 'पसंदीदा से हटाएँ / Remove from favourites'
        : 'पसंदीदा में जोड़ें / Add to favourites';
      const heart = btn.querySelector('.fav-heart');
      if (heart) heart.textContent = isFav ? '♥' : '♡';
    });
  }

  // ── MODAL OPEN / CLOSE ────────────────────────────────────────────────────
  function openModal() {
    const wrap = $('auth-modal-wrap');
    if (!wrap) return;
    wrap.classList.remove('hidden');
    // Reset state
    const msg        = $('auth-message');
    const emailInput = $('auth-email-input');
    if (msg)        { msg.textContent = ''; msg.style.color = ''; }
    if (emailInput) emailInput.value = '';
  }

  function closeModal() {
    const wrap = $('auth-modal-wrap');
    if (wrap) wrap.classList.add('hidden');
  }

  // ── SIGN IN WITH GOOGLE ───────────────────────────────────────────────────
  async function signInWithGoogle() {
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) {
      const msg = $('auth-message');
      if (msg) { msg.textContent = 'Error: ' + error.message; msg.style.color = '#eb5757'; }
    }
  }

  // ── SIGN IN WITH EMAIL (magic link) ──────────────────────────────────────
  async function signInWithEmail() {
    const emailInput = $('auth-email-input');
    const emailBtn   = $('auth-email-btn');
    const msg        = $('auth-message');
    const email      = emailInput?.value?.trim();

    if (!email || !email.includes('@')) {
      if (msg) { msg.textContent = 'Please enter a valid email address.'; msg.style.color = '#eb5757'; }
      return;
    }

    if (emailBtn) emailBtn.disabled = true;
    if (msg)      { msg.textContent = 'Sending link…'; msg.style.color = ''; }

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });

    if (error) {
      if (msg)      { msg.textContent = 'Error: ' + error.message; msg.style.color = '#eb5757'; }
      if (emailBtn) emailBtn.disabled = false;
    } else {
      if (msg)        { msg.textContent = '✓ Check your email — a login link is on its way!'; msg.style.color = '#6fcf97'; }
      if (emailInput) emailInput.value = '';
      if (emailBtn)   emailBtn.disabled = false;
    }
  }

  // ── SIGN OUT ──────────────────────────────────────────────────────────────
  async function signOut() {
    await sb.auth.signOut();
  }

  // ── BIND ALL EVENT LISTENERS ──────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    const loginBtn   = $('auth-login-btn');
    const closeBtn   = $('auth-modal-close');
    const overlay    = $('auth-modal-overlay');
    const googleBtn  = $('auth-google-btn');
    const emailInput = $('auth-email-input');
    const emailBtn   = $('auth-email-btn');
    const logoutBtn  = $('auth-logout-btn');

    if (loginBtn)   loginBtn.addEventListener  ('click',   openModal);
    if (closeBtn)   closeBtn.addEventListener  ('click',   closeModal);
    if (overlay)    overlay.addEventListener   ('click',   closeModal);
    if (googleBtn)  googleBtn.addEventListener ('click',   signInWithGoogle);
    if (logoutBtn)  logoutBtn.addEventListener ('click',   signOut);
    if (emailBtn)   emailBtn.addEventListener  ('click',   signInWithEmail);
    if (emailInput) emailInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') signInWithEmail();
    });

    // Escape key closes modal
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });

    // Favourite button clicks — event delegation so it works on any page
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.fav-btn');
      if (!btn) return;
      e.preventDefault();
      toggleFavourite(btn.dataset.url, btn.dataset.title, btn.dataset.type);
    });

    // Start
    init();
  });

  // ── EXPOSE API FOR THE FAVOURITES PAGE ───────────────────────────────────
  window.BrajAuth = {
    getClient : () => sb,
    getUser   : () => currentUser,
    openModal,
    getFavourites: async () => {
      if (!currentUser) return [];
      const { data } = await sb
        .from('favourites')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      return data || [];
    }
  };

})();