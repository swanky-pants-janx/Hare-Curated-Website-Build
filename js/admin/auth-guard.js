import { getSession } from '../services/auth.service.js';

// Call at the top of every admin page.
// Redirects to login if there is no active session.
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = '/login.html';
    return null;
  }
  return session;
}
