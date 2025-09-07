// API service for connecting to FastAPI backend
// In Replit, use the current domain but replace port 3000 with 8000 for backend
const getBaseURL = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    // We're in Replit environment, use the current domain with port 8000
    const protocol = window.location.protocol; // https: or http:
    const hostname = window.location.hostname; // replit domain
    console.log(`API Base URL: ${protocol}//${hostname}:8000`);
    return `${protocol}//${hostname}:8000`;
  }
  // Local development
  console.log('API Base URL: http://localhost:8000');
  return 'http://localhost:8000';
};

const BASE_URL = getBaseURL();

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

/**
 * Get schedules with role-based filtering
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} JSON response with schedules list
 * @throws {Error} If fetch fails or response is not ok
 */
export async function getSchedules(token) {
  try {
    const response = await fetch(`${BASE_URL}/schedules`, {
      method: 'GET',
      headers: {
        'X-Demo-Token': token
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to get schedules: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to get schedules: ${error.message}`);
  }
}

/**
 * Create a new schedule
 * @param {string} token - Authentication token
 * @param {Object} scheduleData - Schedule data {fecha, turno, empleado_id}
 * @returns {Promise<Object>} JSON response with created schedule
 * @throws {Error} If fetch fails or response is not ok
 */
export async function createSchedule(token, scheduleData) {
  try {
    const response = await fetch(`${BASE_URL}/schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Demo-Token': token
      },
      body: JSON.stringify(scheduleData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to create schedule: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to create schedule: ${error.message}`);
  }
}

/**
 * Get tasks with optional employee filtering
 * @param {string} token - Authentication token
 * @param {number|null} empleadoId - Optional employee ID to filter tasks
 * @returns {Promise<Object>} JSON response with tasks list
 * @throws {Error} If fetch fails or response is not ok
 */
export async function getTasks(token, empleadoId = null) {
  try {
    let url = `${BASE_URL}/tasks`;
    if (empleadoId) {
      url += `?empleado_id=${empleadoId}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Demo-Token': token
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to get tasks: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to get tasks: ${error.message}`);
  }
}

/**
 * Create a new task
 * @param {string} token - Authentication token
 * @param {Object} taskData - Task data {titulo, descripcion, empleado_id, fecha, prioridad}
 * @returns {Promise<Object>} JSON response with created task
 * @throws {Error} If fetch fails or response is not ok
 */
export async function createTask(token, taskData) {
  try {
    const response = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Demo-Token': token
      },
      body: JSON.stringify(taskData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to create task: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }
}

/**
 * Update task status
 * @param {string} token - Authentication token
 * @param {number} taskId - Task ID to update
 * @param {string} status - New status (pendiente, en_progreso, completada)
 * @returns {Promise<Object>} JSON response with updated task
 * @throws {Error} If fetch fails or response is not ok
 */
export async function updateTaskStatus(token, taskId, status) {
  try {
    const response = await fetch(`${BASE_URL}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Demo-Token': token
      },
      body: JSON.stringify({ estado: status })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to update task: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to update task: ${error.message}`);
  }
}