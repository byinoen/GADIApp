import { request } from './apiClient.js';

/**
 * Authenticate user with email and password
 * @param {string} email - User email
 * @param {string} password - User password 
 * @returns {Promise} - Auth response with token and user data
 */
export async function login(email, password) {
  const response = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  // Save authentication data to localStorage
  if (response.token) {
    localStorage.setItem('token', response.token);
    localStorage.setItem('X-Demo-Token', response.token);
  }
  
  if (response.user) {
    localStorage.setItem('user', JSON.stringify(response.user));
  }

  return response;
}

/**
 * Logout user by clearing localStorage
 */
export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('X-Demo-Token');
  localStorage.removeItem('user');
}

/**
 * Get stored user data from localStorage
 * @returns {object|null} - User data or null if not found
 */
export function getStoredUser() {
  try {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error parsing stored user data:', error);
    return null;
  }
}

/**
 * Get stored token from localStorage
 * @returns {string|null} - Token or null if not found
 */
export function getStoredToken() {
  return localStorage.getItem('token') || localStorage.getItem('X-Demo-Token');
}