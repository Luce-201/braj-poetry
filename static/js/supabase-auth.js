// ============================================
// Braj Awadhi Kavyalok — Auth & Favourites
// Powered by Supabase
// Favourites cached in sessionStorage — only
// one Supabase fetch per browsing session.
// ============================================

(function () {

  const SUPABASE_URL = 'https://sktwptunwlnhntwmglvw.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_w6u93KdBShe57XH0O2825g_l6RhjFz-';

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  let currentUser    = null;
  let userFavourites = new Set();

  function $(id) { return document.getElementById(id); }

  // ── SESSION CACHE ─────────────────────────────────────────────────────────
  // Favourites are stored in sessionStorage after the first fetch.
  // sessionStorage is cleared automatically when the browser tab is closed,
  // so each new browsing session gets a fresh fetch. Within a session,
  // all pages share the same cached list — zero extra Supabase calls.

  function cacheKey(userId) {
    return 'braj_favs_' + userId;
  }

  function readCache(userId) {
    try {
      const raw = sessionStorage.getItem(cacheKey(userId));
      if (!raw) return null;
      return new Set(JSON.parse(raw));
    } catch (e) {
      return null;
    }
  }

  function writeCache(userId, favouriteSet) {
    try {
      sessionStorage.setItem(
        cacheKey(userId),
        JSON.stringify([...favouriteSet])
      );
    } catch (e) {
      // sessionStorage full or unavailable — fail silently
    }
  }

  function clearCache(userId) {
    if (userId) sessionStorage.removeItem(cacheKey(userId));
  }

  // ── INITIALISE ────────────────────────────────────────────────────────────
  async function init() {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) await onSignedIn(session.user);
    else               onSignedOut();

    sb.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) await onSignedIn(session.user);
      else               onSignedOut();
    });
  }

  // ── SIGNED IN ─────────────────────────────────────────────────────────────
  async function onSignedIn(user) {
    currentUser = user;

    const name    = user.user_metadata?.full_name
                 || user.user_metadata?.name
                 || user.email?.split('@')[0]
                 || 'User';
    const initial = name.charAt(0).toUpperCase();

    const nameEl   = $('auth-user-name');
    const avatarEl = $('auth-user-avatar');
    const loginBtn = $('auth-login-btn');
    const userMenu = $('auth-user-menu');

    if (nameEl)   nameEl.textContent   = name;
    if (avatarEl) avatarEl.textContent = initial;
    if (loginBtn) loginBtn.style.display = 'none';
    if (userMenu) userMenu.style.display = 'flex';

    // Mirror state in mobile nav too
    const mobileNameEl   = $('mobile-auth-user-name');
    const mobileAvatarEl = $('mobile-auth-user-avatar');
    const mobileLoginBtn = $('mobile-auth-login-btn');
    const mobileUserMenu = $('mobile-auth-user-menu');
    if (mobileNameEl)   mobileNameEl.textContent   = name;
    if (mobileAvatarEl) mobileAvatarEl.textContent = initial;
    if (mobileLoginBtn) mobileLoginBtn.style.display = 'none';
    if (mobileUserMenu) mobileUserMenu.style.display = 'flex';

    await loadFavourites();
    updateFavBtns();
    closeModal();
  }

  // ── SIGNED OUT ────────────────────────────────────────────────────────────
  function onSignedOut() {
    // Clear the session cache before wiping currentUser
    if (currentUser) clearCache(currentUser.id);

    currentUser = null;
    userFavourites.clear();

    const loginBtn = $('auth-login-btn');
    const userMenu = $('auth-user-menu');
    if (loginBtn) loginBtn.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';

    const mobileLoginBtn = $('mobile-auth-login-btn');
    const mobileUserMenu = $('mobile-auth-user-menu');
    if (mobileLoginBtn) mobileLoginBtn.style.display = 'flex';
    if (mobileUserMenu) mobileUserMenu.style.display = 'none';

    updateFavBtns();
  }

  // ── LOAD FAVOURITES ───────────────────────────────────────────────────────
  // Checks the session cache first.
  // Only hits Supabase if the cache is empty (i.e. first page of this session).
  async function loadFavourites() {
    if (!currentUser) return;

    // 1. Try cache
    const cached = readCache(currentUser.id);
    if (cached) {
      userFavourites = cached;
      return; // ← no Supabase call needed
    }

    // 2. Cache miss — fetch from Supabase (happens once per session)
    const { data, error } = await sb
      .from('favourites')
      .select('item_url')
      .eq('user_id', currentUser.id);

    if (!error && data) {
      userFavourites = new Set(data.map(r => r.item_url));
      writeCache(currentUser.id, userFavourites); // save for remaining pages
    }
  }

  // ── TOGGLE A FAVOURITE ────────────────────────────────────────────────────
  async function toggleFavourite(url, title, type) {
    if (!currentUser) { openModal(); return; }

    if (userFavourites.has(url)) {
      await sb.from('favourites')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('item_url', url);
      userFavourites.delete(url);
    } else {
      await sb.from('favourites').insert({
        user_id:    currentUser.id,
        item_url:   url,
        item_title: title,
        item_type:  type,
      });
      userFavourites.add(url);
    }

    // Keep cache in sync so navigating to another page stays accurate
    writeCache(currentUser.id, userFavourites);
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

  // ── MODAL ─────────────────────────────────────────────────────────────────
  function openModal() {
    const wrap = $('auth-modal-wrap');
    if (!wrap) return;
    wrap.classList.remove('hidden');
    const msg        = $('auth-message');
    const emailInput = $('auth-email-input');
    if (msg)        { msg.textContent = ''; msg.style.color = ''; }
    if (emailInput) emailInput.value = '';
  }

  function closeModal() {
    const wrap = $('auth-modal-wrap');
    if (wrap) wrap.classList.add('hidden');
  }

  // ── GOOGLE SIGN IN ────────────────────────────────────────────────────────
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

  // ── EMAIL MAGIC LINK ──────────────────────────────────────────────────────
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

  // ── EVENT LISTENERS ───────────────────────────────────────────────────────
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

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });

    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.fav-btn');
      if (!btn) return;
      e.preventDefault();
      toggleFavourite(btn.dataset.url, btn.dataset.title, btn.dataset.type);
    });

    init();
  });

  // ── PUBLIC API (used by favourites page) ──────────────────────────────────
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
