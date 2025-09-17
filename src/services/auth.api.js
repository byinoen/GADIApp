import { request } from './apiClient.js';

/**
 * Authenticate user with email and password
 * @param {string} email - User email
 * @param {string} password - User password 
 * @returns {Promise} - Auth response with access_token and user data
 */
export async function login(email, password) {
  const response = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  // Handle both new JWT format and legacy token format
  const accessToken = response.access_token || response.token;
  const user = response.user;
  const permissions = response.permissions || [];

  if (accessToken && user) {
    // Store auth data in localStorage
    const authData = {
      access_token: accessToken,
      user: user,
      permissions: permissions
    };
    localStorage.setItem('auth', JSON.stringify(authData));
  }

  return { access_token: accessToken, user: user, permissions: permissions };
}

/**
 * Get current user info from server
 * @returns {Promise} - Current user data
 */
export async function me() {
  const response = await request('/auth/me');
  return response.user;
}

/**
 * Logout user by clearing localStorage
 */
export function logout() {
  localStorage.removeItem('auth');
}

/**
 * Get stored auth data from localStorage
 * @returns {object|null} - Auth data with access_token and user, or null if not found
 */
export function getStoredAuth() {
  try {
    const authData = localStorage.getItem('auth');
    if (authData) {
      return JSON.parse(authData);
    }
    return null;
  } catch (error) {
    console.error('Error parsing stored auth data:', error);
    return null;
  }
}

/**
 * Get stored user data from localStorage
 * @returns {object|null} - User data or null if not found
 */
export function getStoredUser() {
  const auth = getStoredAuth();
  return auth ? auth.user : null;
}

/**
 * Get stored access token from localStorage
 * @returns {string|null} - Access token or null if not found
 */
export function getStoredToken() {
  const auth = getStoredAuth();
  return auth ? auth.access_token : null;
}