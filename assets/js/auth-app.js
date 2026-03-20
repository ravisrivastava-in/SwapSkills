/**
 * SwapSkills — auth-app.js
 * Handles login, register, Google sign-in, guest login
 */

async function waitForSS() {
  if (window.SS) return;
  await new Promise(resolve => {
    const interval = setInterval(() => {
      if (window.SS) { clearInterval(interval); resolve(); }
    }, 40);
  });
}

export async function init() {
  await waitForSS();

  const { observeAuth, signUp, login, loginWithGoogle, handleGoogleRedirectResult, loginAnonymously } = window.SS;

  // Show auto-logout alert if redirected from inactivity
  if (sessionStorage.getItem("ss-auto-logout") === "true") {
    document.getElementById("auto-logout-alert")?.classList.remove("d-none");
    sessionStorage.removeItem("ss-auto-logout");
  }

  // Handle Google redirect result (production only — after page reload from redirect)
  const redirectResult = await handleGoogleRedirectResult();
  if (redirectResult.success) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Redirect if already logged in
  observeAuth((user) => {
    if (user) window.location.href = 'dashboard.html';
  });

  // Toggle password visibility
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      const icon = btn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('bi-eye', 'bi-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.replace('bi-eye-slash', 'bi-eye');
      }
    });
  });

  // Show alert helper
  function showAlert(msg, type = 'danger') {
    const el = document.getElementById('auth-alert');
    el.className = `alert alert-${type}`;
    el.textContent = msg;
    el.classList.remove('d-none');
    setTimeout(() => el.classList.add('d-none'), 7000);
  }

  // Loading state helper
  function setLoading(btn, loading) {
    const text = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.spinner-border');
    btn.disabled = loading;
    if (text) text.classList.toggle('d-none', loading);
    if (spinner) spinner.classList.toggle('d-none', !loading);
  }

  // ── Email/Password Login ──
  document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) return showAlert('Please fill in all fields.');

    const btn = document.getElementById('login-btn');
    setLoading(btn, true);
    const result = await login(email, password);
    setLoading(btn, false);

    if (result.success) {
      window.location.href = 'dashboard.html';
    } else {
      showAlert(result.error);
    }
  });

  // ── Email/Password Register ──
  document.getElementById('register-btn').addEventListener('click', async () => {
    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmP = document.getElementById('reg-confirm').value;

    if (!name || !email || !password || !confirmP) return showAlert('Please fill in all fields.');
    if (password.length < 6) return showAlert('Password must be at least 6 characters.');
    if (password !== confirmP) return showAlert('Passwords do not match.');

    const btn = document.getElementById('register-btn');
    setLoading(btn, true);
    const result = await signUp(email, password, name);
    setLoading(btn, false);

    if (result.success) {
      showAlert('Account created successfully! Redirecting to dashboard...', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 1500);
    } else {
      showAlert('Registration failed: ' + result.error);
    }
  });

  // ── Google Sign-In ──
  async function handleGoogleBtn(btn) {
    setLoading(btn, true);
    document.getElementById('google-redirect-loader')?.classList.add('show');
    const result = await loginWithGoogle();
    if (result.success) {
      showAlert('Signed in with Google! Redirecting...', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 1000);
      return;
    }
    document.getElementById('google-redirect-loader')?.classList.remove('show');
    setLoading(btn, false);
    if (result.error && result.error !== 'Sign-in cancelled') {
      showAlert('Google sign-in failed: ' + result.error);
    }
  }

  document.getElementById('google-login-btn').addEventListener('click', function () {
    handleGoogleBtn(this);
  });
  document.getElementById('google-register-btn').addEventListener('click', function () {
    handleGoogleBtn(this);
  });

  // ── Anonymous / Guest Demo Login ──
  document.getElementById('anon-login-btn').addEventListener('click', async function () {
    const btn = this;
    setLoading(btn, true);
    const result = await loginAnonymously();
    setLoading(btn, false);

    if (result.success) {
      showAlert('Signed in as Guest! Redirecting...', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 1000);
    } else {
      showAlert('Guest login failed: ' + result.error);
    }
  });

  // Enter key support
  document.querySelectorAll('#loginForm input').forEach(input => {
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('login-btn').click(); });
  });
  document.querySelectorAll('#registerForm input').forEach(input => {
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('register-btn').click(); });
  });

  console.log("[SS] auth-app.js ready");
}