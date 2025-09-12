import { request } from './apiClient.js';

/**
 * Get all tasks with optional parameters
 * @param {object} params - Query parameters (optional)
 * @returns {Promise} - List of tasks
 */
export async function listTasks(params = {}) {
  let url = '/tasks';
  
  // Add query parameters if provided
  const searchParams = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      searchParams.append(key, params[key]);
    }
  });
  
  if (searchParams.toString()) {
    url += '?' + searchParams.toString();
  }

  const response = await request(url);
  return response.tasks || [];
}

/**
 * Get single task by ID
 * @param {number} id - Task ID
 * @returns {Promise} - Task data
 */
export async function getTask(id) {
  const response = await request(`/tasks/${id}`);
  return response.task;
}

/**
 * Create new task
 * @param {object} dto - Task data
 * @returns {Promise} - Created task
 */
export async function createTask(dto) {
  const response = await request('/tasks', {
    method: 'POST',
    body: JSON.stringify(dto)
  });
  return response.task;
}

/**
 * Update existing task
 * @param {number} id - Task ID
 * @param {object} dto - Updated task data
 * @returns {Promise} - Updated task
 */
export async function updateTask(id, dto) {
  const response = await request(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto)
  });
  return response.task;
}

/**
 * Delete task
 * @param {number} id - Task ID
 * @returns {Promise} - Deletion confirmation
 */
export async function deleteTask(id) {
  const response = await request(`/tasks/${id}`, {
    method: 'DELETE'
  });
  return response;
}