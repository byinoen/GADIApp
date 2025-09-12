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

  if (accessToken && user) {
    // Store auth data in localStorage
    const authData = {
      access_token: accessToken,
      user: user
    };
    localStorage.setItem('auth', JSON.stringify(authData));
  }

  return { access_token: accessToken, user: user };
}

/**
 * Logout user by clearing localStorage
 */
export function logout() {
  localStorage.removeItem('auth');
  // Clean up legacy storage keys if they exist
  localStorage.removeItem('token');
  localStorage.removeItem('X-Demo-Token');
  localStorage.removeItem('user');
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
    
    // Fallback for legacy storage format
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token') || localStorage.getItem('X-Demo-Token');
    
    if (userData && token) {
      return {
        access_token: token,
        user: JSON.parse(userData)
      };
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