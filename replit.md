# GADIApp - Expo React Native Project

## Overview
This is an Expo React Native application with cross-platform support (iOS, Android, and Web). The project uses file-based routing with Expo Router and TypeScript.

## Project Architecture
- **Framework**: Expo ~53.0.22 with React Native 0.79.6
- **Routing**: Expo Router with file-based routing
- **UI**: Tab-based navigation with themed components
- **Platform Support**: iOS, Android, and Web
- **Language**: TypeScript with strict mode enabled

## Development Setup
- **Development Server**: Expo web development server on port 5000
- **Host Configuration**: Uses LAN mode for Replit proxy compatibility
- **Bundle Type**: Metro bundler for web

## Recent Changes (September 5, 2025)
- Set up project for Replit environment
- Configured Expo web development server with proper host settings
- Created workflow for development server on port 5000
- Configured deployment for production builds
- Installed serve package for static file serving in production

## User Preferences
- Standard Expo/React Native development workflow
- Web-first development approach for this setup

## Project Structure
- `app/` - Main application code with file-based routing
- `components/` - Reusable UI components
- `constants/` - App constants and theming
- `hooks/` - Custom React hooks
- `assets/` - Images, fonts, and other static assets

## Deployment Configuration
- **Type**: Autoscale (for stateless web application)
- **Build**: Expo web export
- **Serve**: Static file serving with serve package