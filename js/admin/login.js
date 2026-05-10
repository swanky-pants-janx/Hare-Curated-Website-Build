import { signIn, getSession } from '../services/auth.service.js';
import { el, on, showError, clearError } from '../utils/dom.js';
import { isValidEmail } from '../utils/sanitize.js';

async function init() {
  // Already logged in? Go straight to dashboard.
  const session = await getSession();
  if (session) {
    window.location.href = '/dashboard.html';
    return;
  }

  const form = el('#login-form');
  const emailInput = el('#login-email');
  const passwordInput = el('#login-password');
  const submitBtn = el('#login-submit');

  on(form, 'submit', async (e) => {
    e.preventDefault();
    clearError('login-error');

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!isValidEmail(email)) {
      showError('login-error', 'Please enter a valid email address.');
      return;
    }
    if (!password) {
      showError('login-error', 'Please enter your password.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    try {
      await signIn(email, password);
      window.location.href = '/dashboard.html';
    } catch (err) {
      showError('login-error', 'Invalid email or password. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In';
    }
  });
}

init();
