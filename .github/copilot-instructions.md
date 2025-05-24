<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Carpool Management Application - Copilot Instructions

## Project Overview
This is a comprehensive carpool management application for schools with:
- **Backend**: Node.js TypeScript on Azure Functions (migrating from Python FastAPI)
- **Frontend**: Next.js with React and TypeScript
- **Database**: Azure Cosmos DB
- **Authentication**: JWT-based authentication
- **Deployment**: Azure Functions (Backend), Azure Static Web Apps (Frontend)

## Key Technologies
- TypeScript (shared between frontend and backend)
- Azure Functions v4 with Node.js
- Next.js 14+ with App Router
- Tailwind CSS for styling
- Zustand for state management
- Jest for testing
- Azure SDK for JavaScript/TypeScript

## Code Style Guidelines
- Use TypeScript strict mode
- Prefer async/await over promises
- Use proper error handling with try/catch
- Follow functional programming patterns where appropriate
- Use descriptive variable and function names
- Include JSDoc comments for complex functions

## Backend Architecture
- Azure Functions with HTTP triggers
- Shared types between frontend and backend in `/shared/types`
- Service layer pattern for business logic
- Repository pattern for data access
- Dependency injection for services

## Frontend Architecture
- Next.js App Router structure
- Server components where possible
- Client components for interactivity
- Shared UI components in `/frontend/components`
- Custom hooks for data fetching
- Zustand stores for global state

## Testing Strategy
- Unit tests for business logic
- Integration tests for API endpoints
- Component tests for React components
- E2E tests for critical user flows
- Mock Azure services in tests

## Security Considerations
- JWT tokens for authentication
- Role-based access control (Admin, Parent, Student)
- Input validation on both client and server
- Secure environment variable handling
- CORS configuration for Azure Functions

## Performance Optimization
- Minimize cold starts in Azure Functions
- Optimize bundle sizes
- Use efficient database queries
- Implement proper caching strategies
- Code splitting for frontend

## Migration Context
This project is migrating from Python FastAPI to Node.js TypeScript for:
- Better Azure Functions integration
- Shared TypeScript codebase
- Improved cold start performance
- Reduced deployment complexity
