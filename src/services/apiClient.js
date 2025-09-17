// Base API client with environment configuration
// Use relative paths since API and frontend are served from the same origin
export const BASE_URL = '';

// Log the API base URL for debugging
console.log('API Base URL:', BASE_URL);

/**
 * Makes HTTP requests to the API server
 * @param {string} path - API endpoint path (e.g. '/auth/login')
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise} - Parsed JSON response
 */
export async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  
  // Get auth data from localStorage
  const authData = localStorage.getItem('auth');
  let accessToken = null;
  
  if (authData) {
    try {
      const auth = JSON.parse(authData);
      accessToken = auth.access_token;
    } catch (e) {
      console.error('Error parsing auth data:', e);
    }
  }
  
  // Merge default headers with provided headers
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
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

// Helper function for API requests
export const apiRequest = (path, method = 'GET', data = null) => {
  const options = {
    method,
    headers: {
      'x-demo-token': 'demo'
    }
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
    options.headers['Content-Type'] = 'application/json';
  }

  return request(path, options);
};

// Employees API
export const employeesApi = {
  getAll: () => apiRequest('/employees'),
  create: (employeeData) => apiRequest('/employees', 'POST', employeeData),
  update: (id, employeeData) => apiRequest(`/employees/${id}`, 'PUT', employeeData),
  delete: (id) => apiRequest(`/employees/${id}`, 'DELETE')
};

// Permissions API
export const permissionsApi = {
  getAll: () => apiRequest('/permissions'),
  getCategories: () => apiRequest('/permissions/categories'),
  getCurrentUserPermissions: () => apiRequest('/auth/me/permissions')
};

// Roles API
export const rolesApi = {
  getAll: () => apiRequest('/roles'),
  getPermissions: (roleId) => apiRequest(`/roles/${roleId}/permissions`),
  updatePermissions: (roleId, permissions) => apiRequest(`/roles/${roleId}/permissions`, 'PUT', { permissions }),
  create: (roleData) => apiRequest('/roles', 'POST', roleData),
  delete: (roleId) => apiRequest(`/roles/${roleId}`, 'DELETE')
};