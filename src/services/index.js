import { BASE_URL } from './apiClient.js';

// API implementations
import * as AuthAPI from './auth.api.js';
import * as EmployeesAPI from './employees.api.js';
import * as SchedulesAPI from './schedules.api.js';

// Mock implementations (available for fallback)
// import * as AuthMock from './auth.mock.js';
// import * as EmployeesMock from './employees.mock.js';
// import * as SchedulesMock from './schedules.mock.js';

/**
 * Service layer barrel export
 * Uses real API implementations when BASE_URL is configured
 */
const services = {
  auth: AuthAPI,
  employees: EmployeesAPI,
  schedules: SchedulesAPI
};

// Log which services are being used
if (BASE_URL) {
  console.log(`🌐 API Services initialized with BASE_URL: ${BASE_URL}`);
} else {
  console.log('⚠️  No BASE_URL configured, check environment variables');
}

// Export services by domain
export const auth = services.auth;
export const employees = services.employees;
export const schedules = services.schedules;

// Default export for convenience
export default services;

// Export BASE_URL for debugging
export { BASE_URL };