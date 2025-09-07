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

/**
 * Get tasks for a specific schedule/date
 * @param {string} token - Authentication token
 * @param {number} scheduleId - Schedule ID to get tasks for
 * @returns {Promise<Object>} JSON response with schedule and tasks
 * @throws {Error} If fetch fails or response is not ok
 */
export async function getScheduleTasks(token, scheduleId) {
  try {
    const response = await fetch(`${BASE_URL}/schedules/${scheduleId}/tasks`, {
      method: 'GET',
      headers: {
        'X-Demo-Token': token
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to get schedule tasks: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to get schedule tasks: ${error.message}`);
  }
}

/**
 * Get manager inbox notifications
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} JSON response with notifications list
 * @throws {Error} If fetch fails or response is not ok
 */
export async function getInboxNotifications(token) {
  try {
    const response = await fetch(`${BASE_URL}/inbox`, {
      method: 'GET',
      headers: {
        'X-Demo-Token': token
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to get inbox notifications: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to get inbox notifications: ${error.message}`);
  }
}

/**
 * Reassign a conflicted task to another employee
 * @param {string} token - Authentication token
 * @param {number} notificationId - Notification ID
 * @param {number} newEmployeeId - New employee ID to assign task to
 * @returns {Promise<Object>} JSON response with reassignment result
 * @throws {Error} If fetch fails or response is not ok
 */
export async function reassignTask(token, notificationId, newEmployeeId) {
  try {
    const response = await fetch(`${BASE_URL}/inbox/${notificationId}/reassign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Demo-Token': token
      },
      body: JSON.stringify({ new_empleado_id: newEmployeeId })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to reassign task: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to reassign task: ${error.message}`);
  }
}

/**
 * Reschedule a conflicted task to a different date
 * @param {string} token - Authentication token
 * @param {number} notificationId - Notification ID
 * @param {string} newDate - New date in YYYY-MM-DD format
 * @returns {Promise<Object>} JSON response with reschedule result
 * @throws {Error} If fetch fails or response is not ok
 */
export async function rescheduleTask(token, notificationId, newDate) {
  try {
    const response = await fetch(`${BASE_URL}/inbox/${notificationId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Demo-Token': token
      },
      body: JSON.stringify({ new_fecha: newDate })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to reschedule task: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to reschedule task: ${error.message}`);
  }
}

// Register Management API
export async function getRegisters(token) {
  try {
    const response = await fetch(`${BASE_URL}/registers`, {
      method: 'GET',
      headers: {
        'X-Demo-Token': token
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to get registers: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to get registers: ${error.message}`);
  }
}

export async function getRegister(token, registerId) {
  try {
    const response = await fetch(`${BASE_URL}/registers/${registerId}`, {
      method: 'GET',
      headers: {
        'X-Demo-Token': token
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to get register: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to get register: ${error.message}`);
  }
}

export async function getRegisterEntries(token, registerId, fechaInicio = null, fechaFin = null) {
  try {
    let url = `${BASE_URL}/registers/${registerId}/entries`;
    const params = new URLSearchParams();
    if (fechaInicio) params.append('fecha_inicio', fechaInicio);
    if (fechaFin) params.append('fecha_fin', fechaFin);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Demo-Token': token
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to get register entries: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to get register entries: ${error.message}`);
  }
}

export async function createRegisterEntry(token, registerId, entryData) {
  try {
    const response = await fetch(`${BASE_URL}/registers/${registerId}/entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Demo-Token': token
      },
      body: JSON.stringify(entryData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to create register entry: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to create register entry: ${error.message}`);
  }
}

export async function exportRegisterPDF(token, registerId, fechaInicio = null, fechaFin = null) {
  try {
    let url = `${BASE_URL}/registers/${registerId}/export/pdf`;
    const params = new URLSearchParams();
    if (fechaInicio) params.append('fecha_inicio', fechaInicio);
    if (fechaFin) params.append('fecha_fin', fechaFin);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Demo-Token': token
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to export register PDF: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to export register PDF: ${error.message}`);
  }
}

// Task Timer API
export async function getTaskDetails(token, taskId) {
  try {
    const response = await fetch(`${BASE_URL}/tasks/${taskId}/details`, {
      method: 'GET',
      headers: {
        'X-Demo-Token': token
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to get task details: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to get task details: ${error.message}`);
  }
}

export async function startTask(token, taskId) {
  try {
    const response = await fetch(`${BASE_URL}/tasks/${taskId}/start`, {
      method: 'POST',
      headers: {
        'X-Demo-Token': token
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to start task: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to start task: ${error.message}`);
  }
}

export async function finishTask(token, taskId, completionData = {}) {
  try {
    const response = await fetch(`${BASE_URL}/tasks/${taskId}/finish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Demo-Token': token
      },
      body: JSON.stringify(completionData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to finish task: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to finish task: ${error.message}`);
  }
}