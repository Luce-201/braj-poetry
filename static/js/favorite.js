// ============================================
// Braj Awadhi Kavyalok — Favourites Engine
// ============================================
(function () {
  const CACHE_KEY = 'braj_favorites_cache';

  // Helper to get active Supabase client
  function getSupabaseClient() {
    return window.BRAJ_SUPABASE || window.supabaseClient;
  }

  async function getCurrentUser() {
    const client = getSupabaseClient();
    if (!client || !client.auth) return null;
    const { data } = await client.auth.getSession();
    return data.session ? data.session.user : null;
  }

  function readCache() {
    try {
      return JSON.parse(sessionStorage.getItem(CACHE_KEY)) || null;
    } catch {
      return null;
    }
  }

  function writeCache(list) {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(list));
  }

  function clearCache() {
    sessionStorage.removeItem(CACHE_KEY);
  }

  async function fetchFavorites(user) {
    if (!user) return [];
    const cached = readCache();
    if (cached) return cached;

    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
      .from('favorites')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Favorites fetch error:', error);
      return [];
    }
    writeCache(data);
    return data;
  }

  async function isFavorited(user, url) {
    const list = await fetchFavorites(user);
    return list.find(f => f.item_url === url) || null;
  }

  async function addFavorite(user, { url, title, type, form }) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('favorites')
      .insert({
        user_id: user.id,
        item_url: url,
        item_title: title,
        item_type: type,
        form: form || null
      })
      .select();

    if (error) {
      console.error('Add favorite error:', error);
      return null;
    }

    const list = readCache() || [];
    if (data && data[0]) {
      list.push(data[0]);
      writeCache(list);
    }
    return data ? data[0] : null;
  }

  async function removeFavorite(user, url) {
    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('item_url', url);

    if (error) {
      console.error('Remove favorite error:', error);
      return;
    }
    writeCache((readCache() || []).filter(f => f.item_url !== url));
  }

  function setButtonState(btn, active) {
    btn.classList.toggle('is-active', active);
  }

  async function initButton(btn) {
    const url = btn.dataset.url;
    const title = btn.dataset.title;
    const type = btn.dataset.type || 'poem';
    const form = btn.dataset.form || '';

    // Check initial favorite status if logged in
    const user = await getCurrentUser();
    if (user) {
      const fav = await isFavorited(user, url);
      setButtonState(btn, !!fav);
    } else {
      setButtonState(btn, false);
    }

    // Attach click event
    btn.addEventListener('click', async function (e) {
      e.preventDefault();
      const currentUser = await getCurrentUser();

      // Open auth modal if not logged in
      if (!currentUser) {
        const modal = document.getElementById('auth-modal');
        if (modal) {
          modal.classList.add('is-open');
        } else {
          alert('पसंदीदा में जोड़ने के लिए साइन इन करें / Please sign in to save favourites.');
        }
        return;
      }

      btn.style.pointerEvents = 'none';
      const existing = await isFavorited(currentUser, url);

      if (existing) {
        setButtonState(btn, false);
        await removeFavorite(currentUser, url);
      } else {
        setButtonState(btn, true);
        await addFavorite(currentUser, { url, title, type, form });
      }
      btn.style.pointerEvents = 'auto';
    });
  }

  async function refreshAllButtons() {
    clearCache();
    const user = await getCurrentUser();
    document.querySelectorAll('.fav-btn').forEach(async btn => {
      if (user) {
        const fav = await isFavorited(user, btn.dataset.url);
        setButtonState(btn, !!fav);
      } else {
        setButtonState(btn, false);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.fav-btn').forEach(initButton);
    const client = getSupabaseClient();
    if (client && client.auth) {
      client.auth.onAuthStateChange(() => refreshAllButtons());
    }
  });

  window.brajFavorites = { getCurrentUser, fetchFavorites, clearCache };
})();