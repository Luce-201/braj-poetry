// ============================================
// Braj Awadhi Kavyalok — Auth Engine (Supabase)
// ============================================
(function () {
  const SUPABASE_URL = 'https://sktwptunwlnhntwmglvw.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_w6u93KdBShe57XH0O2825g_l6RhjFz-';

  if (!window.supabase) {
    console.error('Supabase SDK missing. Ensure script tag is in baseof.html');
    return;
  }

  // Initialize client and attach to global window object
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.BRAJ_SUPABASE = sb;

  let currentUser = null;

  const modal = document.getElementById('auth-modal');
  const modalClose = document.getElementById('auth-modal-close');
  const googleBtn = document.getElementById('auth-google-btn');
  const magicForm = document.getElementById('auth-magic-form');
  const magicInput = document.getElementById('auth-magic-email');
  const magicStatus = document.getElementById('auth-magic-status');

  function openModal() {
    if (modal) modal.classList.add('is-open');
  }

  function closeModal() {
    if (modal) modal.classList.remove('is-open');
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Google OAuth Sign In
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href }
      });
      if (error && magicStatus) {
        magicStatus.textContent = 'त्रुटि / Error: ' + error.message;
      }
    });
  }

  // Magic Link Sign In
  if (magicForm) {
    magicForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (magicInput.value || '').trim();
      if (!email) return;

      if (magicStatus) magicStatus.textContent = 'भेजा जा रहा है... / Sending...';
      const { error } = await sb.auth.signInWithOtp({ email });

      if (error) {
        if (magicStatus) magicStatus.textContent = 'त्रुटि / Error: ' + error.message;
      } else {
        if (magicStatus) magicStatus.textContent = 'लिंक भेजा गया! / Magic link sent!';
      }
    });
  }

  sb.auth.getSession().then((res) => {
    currentUser = res.data.session ? res.data.session.user : null;
  });

  sb.auth.onAuthStateChange((_event, session) => {
    currentUser = session ? session.user : null;
    if (currentUser) closeModal();
  });
})();