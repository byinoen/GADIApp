// API service for connecting to FastAPI backend
const BASE_URL = "http://localhost:8000";

/**
 * Health check endpoint
 * @returns {Promise<Object>} JSON response from health endpoint
 * @throws {Error} If fetch fails or response is not ok
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to check health: ${error.message}`);
  }
}

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} JSON response with token and user data
 * @throws {Error} If fetch fails or response is not ok
 */
export async function login(email, password) {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Login failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to login: ${error.message}`);
  }
}