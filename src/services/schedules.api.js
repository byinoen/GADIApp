import { request } from './apiClient.js';

/**
 * Get all schedules with optional parameters
 * @param {object} params - Query parameters (optional)
 * @returns {Promise} - List of schedules
 */
export async function listSchedules(params = {}) {
  let url = '/schedules';
  
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
  return response.schedules || [];
}

/**
 * Get single schedule by ID
 * @param {number} id - Schedule ID
 * @returns {Promise} - Schedule data
 */
export async function getSchedule(id) {
  const response = await request(`/schedules/${id}`);
  return response.schedule;
}

/**
 * Create new schedule
 * @param {object} dto - Schedule data
 * @returns {Promise} - Created schedule
 */
export async function createSchedule(dto) {
  const response = await request('/schedules', {
    method: 'POST',
    body: JSON.stringify(dto)
  });
  return response.schedule;
}

/**
 * Update existing schedule
 * @param {number} id - Schedule ID
 * @param {object} dto - Updated schedule data
 * @returns {Promise} - Updated schedule
 */
export async function updateSchedule(id, dto) {
  const response = await request(`/schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto)
  });
  return response.schedule;
}

/**
 * Delete schedule
 * @param {number} id - Schedule ID
 * @returns {Promise} - Deletion confirmation
 */
export async function deleteSchedule(id) {
  const response = await request(`/schedules/${id}`, {
    method: 'DELETE'
  });
  return response;
}