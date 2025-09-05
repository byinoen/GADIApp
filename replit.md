# GADIApp - React Native Frontend with FastAPI Backend

## Overview
This is a full-stack application with an Expo React Native frontend and a FastAPI backend. The frontend provides a Spanish-language interface with tab navigation, while the backend offers REST API endpoints.

## Project Architecture
### Frontend
- **Framework**: Expo ~53.0.22 with React Native 0.79.6
- **Routing**: Expo Router with file-based routing
- **UI**: Tab-based navigation with Spanish labels
- **Platform Support**: iOS, Android, and Web
- **Language**: TypeScript with strict mode enabled

### Backend
- **Framework**: FastAPI with Python 3.11
- **API**: REST endpoints with health checking
- **Development**: Auto-reload with uvicorn

## Development Setup
- **Frontend Server**: Expo web development server on port 5000
- **Backend Server**: FastAPI/uvicorn server on port 8000
- **Host Configuration**: Frontend uses LAN mode for Replit proxy compatibility

## Recent Changes (September 5, 2025)
- Added FastAPI backend with health endpoint
- Implemented Spanish tab navigation (Horarios, Tareas, Perfil)
- Added interactive button with Spanish alerts
- Configured dual workflows for frontend and backend
- Set up Python environment with required dependencies

## User Preferences
- Spanish language interface throughout
- Standard Expo/React Native development workflow
- FastAPI for backend API development

## Project Structure
- `app/` - React Native frontend code with file-based routing
  - `(tabs)/` - Tab navigation screens (index.tsx, tareas.tsx, perfil.tsx)
- `app/main.py` - FastAPI backend application
- `components/` - Reusable UI components
- `constants/` - App constants and theming
- `hooks/` - Custom React hooks
- `assets/` - Images, fonts, and other static assets
- `requirements.txt` - Python dependencies

## API Endpoints
- `GET /health` - Returns {"status": "ok"} for health checking

## Deployment Configuration
- **Type**: Autoscale (for stateless web application)
- **Build**: Expo web export
- **Serve**: Static file serving with serve package