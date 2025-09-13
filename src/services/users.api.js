import { request } from './apiClient.js';

/**
 * Get all users
 * @returns {Promise} - List of users
 */
export async function listUsers() {
  const response = await request('/api/v1/users');
  return response.users || response;
}

/**
 * Get specific user by ID
 * @param {number} id - User ID
 * @returns {Promise} - User data
 */
export async function getUser(id) {
  const response = await request(`/api/v1/users/${id}`);
  return response.user || response;
}

/**
 * Create new user
 * @param {object} userData - User data {email, nombre, role, employee_id?, password}
 * @returns {Promise} - Created user data
 */
export async function createUser(userData) {
  const response = await request('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
  return response;
}

/**
 * Update existing user
 * @param {number} id - User ID
 * @param {object} userData - Updated user data {nombre?, role?, employee_id?, password?}
 * @returns {Promise} - Updated user data
 */
export async function updateUser(id, userData) {
  const response = await request(`/api/v1/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  });
  return response;
}

/**
 * Delete user
 * @param {number} id - User ID
 * @returns {Promise} - Delete confirmation
 */
export async function deleteUser(id) {
  const response = await request(`/api/v1/users/${id}`, {
    method: 'DELETE'
  });
  return response;
}