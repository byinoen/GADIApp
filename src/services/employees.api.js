import { request } from './apiClient.js';

/**
 * Get all employees
 * @returns {Promise} - List of employees
 */
export async function listEmployees() {
  const response = await request('/employees');
  return response.employees || [];
}

/**
 * Get single employee by ID
 * @param {number} id - Employee ID
 * @returns {Promise} - Employee data
 */
export async function getEmployee(id) {
  const response = await request(`/employees/${id}`);
  return response.employee;
}

/**
 * Create new employee
 * @param {object} dto - Employee data
 * @returns {Promise} - Created employee
 */
export async function createEmployee(dto) {
  const response = await request('/employees', {
    method: 'POST',
    body: JSON.stringify(dto)
  });
  return response.employee;
}

/**
 * Update existing employee
 * @param {number} id - Employee ID
 * @param {object} dto - Updated employee data
 * @returns {Promise} - Updated employee
 */
export async function updateEmployee(id, dto) {
  const response = await request(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto)
  });
  return response.employee;
}

/**
 * Delete/deactivate employee
 * @param {number} id - Employee ID
 * @returns {Promise} - Deletion confirmation
 */
export async function deleteEmployee(id) {
  const response = await request(`/employees/${id}`, {
    method: 'DELETE'
  });
  return response;
}