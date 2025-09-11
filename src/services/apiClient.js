// Base API client with environment configuration
export const BASE_URL = import.meta.env?.VITE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * Makes HTTP requests to the API server
 * @param {string} path - API endpoint path (e.g. '/auth/login')
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise} - Parsed JSON response
 */
export async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  
  // Get token from localStorage if available
  const token = localStorage.getItem('token') || localStorage.getItem('X-Demo-Token');
  
  // Merge default headers with provided headers
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'X-Demo-Token': token }),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch (e) {
        // Use default error message if JSON parsing fails
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${url}`, error);
    throw error;
  }
}