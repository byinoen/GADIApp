# GADIApp - React Web Frontend with FastAPI Backend

## Overview
This is a full-stack application with a React web frontend and a FastAPI backend. The frontend provides a Spanish-language interface for authentication and schedule management, while the backend offers REST API endpoints with role-based access control.

## Project Architecture
### Frontend
- **Framework**: React 18.2.0 with React Scripts
- **Structure**: Clean /src organization with components, services, contexts
- **UI**: Spanish-language interface with role-based authentication
- **Styling**: CSS modules with responsive design
- **Development**: Create React App with hot reload

### Backend
- **Framework**: FastAPI with Python 3.11
- **API**: REST endpoints with role-based authentication
- **CORS**: Configured for cross-origin requests
- **Development**: Auto-reload with uvicorn

## Development Setup
- **Frontend Server**: React development server on port 5000 (npm start)
- **Backend Server**: FastAPI/uvicorn server on port 8000
- **Host Configuration**: Both servers bound to 0.0.0.0 for Replit compatibility

## Recent Changes (September 8, 2025)
- **MAJOR**: Converted from React Native/Expo to pure React web application
- Restructured codebase to /src with components, services, contexts folders
- Created App.js entry point with authentication flow
- Converted all React Native components to React web with CSS styling
- Updated package.json to use React web dependencies only
- Configured npm start workflow for Replit webview compatibility
- Maintained Spanish UI and role-based authentication system
- Kept FastAPI backend integration and schedule management features
- **NEW**: Added comprehensive task management system with role-based access
- Added TasksScreen component with task creation, viewing, and status updates
- Enhanced navigation with tabs for switching between schedules and tasks
- Implemented task priority system (baja, media, alta) with visual indicators
- Added task status management (pendiente, en_progreso, completada)
- **LATEST**: Added flexible custom field management system for registers
- Implemented custom field types: text, textarea, number, date, select (dropdown)
- Added field validation with required/optional settings and dropdown options
- Enhanced management interface with dynamic field creation and editing
- Updated backend with custom field validation and storage
- Integrated custom fields with existing register entry and PDF export workflows

## User Preferences
- Spanish language interface throughout
- Clean React web application structure
- Role-based authentication and access control
- FastAPI for backend API development

## Project Structure
### Frontend (/src)
- `src/App.js` - Main application entry point with routing
- `src/components/` - React components (LoginScreen, WorkSchedulesScreen, TasksScreen, ManagementScreen, RegisterScreen)
- `src/services/` - API service layer for backend communication
- `src/contexts/` - React contexts (AuthContext for user state)
- `public/` - Static HTML and assets
- `package.json` - React web dependencies only

### Key Components
- `ManagementScreen.js` - Administrative interface for creating registers with custom fields
- `RegisterScreen.js` - Register entry interface with dynamic custom field forms
- `TaskDetailModal.js` - Task detail and timer interface with register integration

### Backend
- `app/main.py` - FastAPI application with CORS configuration
- `app/routers/` - API routes (auth, schedules, health)
- `requirements.txt` - Python dependencies

## API Endpoints
- `GET /health` - Health check endpoint
- `POST /auth/login` - User authentication with role-based response
- `GET /schedules` - Get schedules (filtered by user role)
- `POST /schedules` - Create new schedule (admin/encargado only)
- `GET /tasks` - Get tasks (filtered by employee ID for workers)
- `POST /tasks` - Create new task (admin/encargado only)
- `PUT /tasks/{task_id}` - Update task status (assignee or management)
- `GET /registers` - Get all registers with custom field definitions
- `POST /registers` - Create register with custom fields (admin/encargado only)
- `PUT /registers/{id}` - Update register and custom fields (admin/encargado only)
- `GET /registers/{id}/entries` - Get register entries with custom field data
- `POST /registers/{id}/entries` - Create register entry with custom field validation

## Authentication Roles
- **admin@example.com** (1234) - Full access to all features
- **encargado@example.com** (1234) - Manager access, can create schedules
- **trabajador@example.com** (1234) - Worker access, view assigned schedules only

## Deployment Configuration
- **Type**: Autoscale (stateless web application)
- **Build**: npm run build (React production build)
- **Run**: npm start for development, serve build/ for production