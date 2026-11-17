/* ============================================================
   Auto-Agent — Login Script
   Handles the initial authentication screen and unlocks the app
   ============================================================ */

const DEMO_LOGIN_EMAIL = 'ayoubadoini1994@gmail.com';
const DEMO_LOGIN_PASSWORD = '123456';
const AUTH_STORAGE_KEY = 'auto_agent_authenticated';

function isAuthenticated() {
  return sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true';
}

function setAuthenticated(value) {
  if (value) {
    sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
  } else {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

function showSiteShell() {
  document.body.classList.add('authenticated');
  var loginScreen = document.getElementById('login-screen');
  var appShell = document.getElementById('app-shell');
  var navbar = document.getElementById('site-navbar');
  if (loginScreen) loginScreen.style.display = 'none';
  if (appShell) appShell.classList.add('is-visible');
  if (navbar) navbar.classList.add('is-visible');
}

function showLoginScreen() {
  document.body.classList.remove('authenticated');
  var loginScreen = document.getElementById('login-screen');
  var appShell = document.getElementById('app-shell');
  var navbar = document.getElementById('site-navbar');
  if (loginScreen) loginScreen.style.display = 'flex';
  if (appShell) appShell.classList.remove('is-visible');
  if (navbar) navbar.classList.remove('is-visible');
}

function handleLogin(event) {
  event.preventDefault();
  var email = document.getElementById('login-email').value.trim().toLowerCase();
  var password = document.getElementById('login-password').value;
  var errorBox = document.getElementById('login-error');

  if (email === DEMO_LOGIN_EMAIL && password === DEMO_LOGIN_PASSWORD) {
    setAuthenticated(true);
    if (errorBox) errorBox.textContent = '';
    window.location.href = '/app';
    return;
  }

  if (errorBox) {
    errorBox.textContent = 'Identifiants incorrects. Vérifiez l\'email et le mot de passe.';
  }
}

function handleLogout() {
  setAuthenticated(false);
  window.location.href = '/';
  var loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.reset();
  var errorBox = document.getElementById('login-error');
  if (errorBox) errorBox.textContent = '';
}

document.addEventListener('DOMContentLoaded', function () {
  var loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (isAuthenticated()) {
    window.location.href = '/app';
    return;
  }

  showLoginScreen();
});
