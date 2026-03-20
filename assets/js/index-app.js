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
        authBtns.innerHTML = '<a class="btn-getstarted auth-btn-full" href="dashboard.html"><i class="bi bi-speedometer2 me-1"></i>Dashboard</a><a class="btn-getstarted auth-btn-icon" href="dashboard.html" title="Dashboard"><i class="bi bi-speedometer2"></i></a>';
        authBtns.style.display = 'flex';
      }
    } else {
      if (authBtns) {
        authBtns.innerHTML = '<a class="btn-getstarted auth-btn-full" href="auth.html">Login / Register</a><a class="btn-getstarted auth-btn-icon" href="auth.html" title="Login / Register"><i class="bi bi-box-arrow-in-right"></i></a>';
        authBtns.style.display = 'flex';
      }
    }
  });

  console.log("[SS] index-app.js ready");
}