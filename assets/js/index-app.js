/**
 * SwapSkills — index-app.js
 * Home page auth state: shows Login/Register or Dashboard button
 */

async function waitForSS() {
  if (window.SS) return;
  await new Promise(r => {
    const i = setInterval(() => { if (window.SS) { clearInterval(i); r(); } }, 50);
  });
}

export async function init() {
  await waitForSS();

  SS.observeAuth((user) => {
    const authBtns = document.getElementById('auth-buttons-header');
    if (user) {
      if (authBtns) {
        authBtns.innerHTML = '<a class="btn-getstarted" href="dashboard.html"><i class="bi bi-speedometer2 me-1"></i>Dashboard</a>';
        authBtns.style.display = 'block';
      }
    } else {
      if (authBtns) {
        authBtns.innerHTML = '<a class="btn-getstarted" href="auth.html">Login / Register</a>';
        authBtns.style.display = 'block';
      }
    }
  });

  console.log("[SS] index-app.js ready");
}