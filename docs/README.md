# vCarpool Project Documentation

## Table of Contents
- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Development Guide](#development-guide)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Performance](#performance)
- [Monitoring](#monitoring)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

## Project Overview

vCarpool is a comprehensive carpool management application designed for schools, providing a secure and efficient platform for organizing shared transportation. The application consists of:

- **Backend**: Node.js TypeScript on Azure Functions
- **Frontend**: Next.js 14+ with React and TypeScript
- **Database**: Azure Cosmos DB
- **Authentication**: JWT-based with role-based access control
- **Deployment**: Azure Functions (Backend), Azure Static Web Apps (Frontend)

### Key Features
- User registration and authentication (Parents, Students, Admins)
- Carpool trip creation and management
- Real-time trip tracking and notifications
- Advanced security with rate limiting and threat detection
- Comprehensive monitoring and alerting
- Automated backup and disaster recovery

## Architecture

### System Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend      │    │    Database     │
│   (Next.js)     │◄──►│ (Azure Functions)│◄──►│  (Cosmos DB)    │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌─────────┐          ┌──────────────┐       ┌─────────────────┐
    │   CDN   │          │  Monitoring  │       │   Backup Store  │
    │ (Azure) │          │  & Alerts    │       │   (Azure Blob)  │
    └─────────┘          └──────────────┘       └─────────────────┘
```

### Backend Architecture
- **Functions**: HTTP-triggered Azure Functions for API endpoints
- **Services**: Business logic layer (Auth, Trip, User, Email)
- **Repositories**: Data access layer with Cosmos DB integration
- **Middleware**: Request processing, validation, security, rate limiting
- **Utils**: Shared utilities for caching, logging, monitoring

### Frontend Architecture
- **App Router**: Next.js 14+ App Router with server/client components
- **State Management**: Zustand stores with performance optimizations
- **Components**: Reusable UI components with lazy loading
- **Hooks**: Custom hooks for data fetching and performance monitoring

## Getting Started

### Prerequisites
- Node.js 18+
- Azure Functions Core Tools v4
- Azure CLI
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vcarpool
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   cd ..
   
   # Install frontend dependencies
   cd frontend
   npm install
   cd ..
   
   # Install shared dependencies
   cd shared
   npm install
   cd ..
   ```

3. **Configure environment variables**
   ```bash
   # Backend configuration
   cp backend/local.settings.json.example backend/local.settings.json
   # Edit backend/local.settings.json with your Azure Cosmos DB connection string
   
   # Frontend configuration
   cp frontend/.env.local.example frontend/.env.local
   # Edit frontend/.env.local with your API endpoints
   ```

4. **Start development servers**
   ```bash
   # Start backend (Azure Functions)
   cd backend
   npm run dev
   
   # In another terminal, start frontend
   cd frontend
   npm run dev
   ```

## Development Guide

### Code Style and Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Enforced code quality rules
- **Prettier**: Code formatting
- **Jest**: Unit and integration testing
- **Playwright**: E2E testing

### Project Structure
```
vcarpool/
├── backend/           # Azure Functions backend
│   ├── src/
│   │   ├── functions/     # HTTP-triggered functions
│   │   ├── services/      # Business logic
│   │   ├── repositories/  # Data access
│   │   ├── middleware/    # Request processing
│   │   ├── utils/         # Shared utilities
│   │   └── config/        # Configuration
│   └── tests/         # Backend tests
├── frontend/          # Next.js frontend
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── components/    # Reusable components
│   │   ├── hooks/         # Custom hooks
│   │   ├── store/         # Zustand stores
│   │   └── utils/         # Frontend utilities
│   └── e2e/           # E2E tests
├── shared/            # Shared types and utilities
└── infra/             # Infrastructure as Code
```

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test**
   ```bash
   # Run backend tests
   cd backend && npm test
   
   # Run frontend tests
   cd frontend && npm test
   
   # Run E2E tests
   cd frontend && npm run test:e2e
   ```

3. **Build and validate**
   ```bash
   # Build backend
   cd backend && npm run build
   
   # Build frontend
   cd frontend && npm run build
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

### Adding New Features

#### Backend - Adding a New API Endpoint
1. Create function in `backend/src/functions/`
2. Add business logic in `backend/src/services/`
3. Add data access in `backend/src/repositories/`
4. Add tests in `backend/src/services/__tests__/`

#### Frontend - Adding a New Page
1. Create page in `frontend/src/app/`
2. Add components in `frontend/src/components/`
3. Add state management in `frontend/src/store/`
4. Add E2E tests in `frontend/e2e/`

## Deployment

### Azure Resources
The application uses the following Azure resources:
- **Azure Functions**: Backend API hosting
- **Azure Static Web Apps**: Frontend hosting
- **Azure Cosmos DB**: Database
- **Azure Blob Storage**: File storage and backups
- **Azure Application Insights**: Monitoring

### Deployment Process

1. **Deploy Infrastructure**
   ```bash
   # Deploy using Bicep template
   az deployment group create \
     --resource-group vcarpool-rg \
     --template-file infra/main.bicep \
     --parameters @infra/main.parameters.json
   ```

2. **Deploy Backend**
   ```bash
   cd backend
   npm run build
   func azure functionapp publish vcarpool-functions
   ```

3. **Deploy Frontend**
   ```bash
   cd frontend
   npm run build
   # Deployed automatically via GitHub Actions to Azure Static Web Apps
   ```

### Environment Variables

#### Backend (`local.settings.json`)
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_DB_CONNECTION_STRING": "your-cosmos-connection-string",
    "JWT_SECRET": "your-jwt-secret",
    "EMAIL_SERVICE_KEY": "your-email-service-key"
  }
}
```

#### Frontend (`.env.local`)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:7071/api
NEXT_PUBLIC_APP_NAME=vCarpool
```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh-token` - Refresh JWT token

### Trip Management Endpoints
- `GET /api/trips/list` - List trips with filtering
- `POST /api/trips/create` - Create new trip
- `PUT /api/trips/update` - Update trip details
- `POST /api/trips/join` - Join a trip
- `POST /api/trips/leave` - Leave a trip
- `GET /api/trips/stats` - Get trip statistics

### User Management Endpoints
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/update` - Update user profile

For detailed API documentation with schemas and examples, visit:
- Swagger UI: `/api/docs/swagger`
- ReDoc UI: `/api/docs/redoc`

## Security

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Configurable rate limits per endpoint
- **Input Validation**: Comprehensive input sanitization and validation
- **SQL Injection Protection**: Parameterized queries and input filtering
- **XSS Protection**: Content sanitization and CSP headers
- **HTTPS Only**: Enforced secure connections
- **Role-Based Access**: Admin, Parent, Student role permissions

### Security Monitoring
- **Threat Detection**: Real-time security threat scanning
- **Suspicious Activity Monitoring**: Automated detection of unusual patterns
- **Security Metrics**: Dashboard with security KPIs
- **Alert System**: Immediate notifications for security incidents

### Security Best Practices
1. **Never commit secrets**: Use environment variables
2. **Validate all inputs**: Server-side validation required
3. **Use HTTPS**: All communications must be encrypted
4. **Regular security scans**: Automated vulnerability scanning
5. **Principle of least privilege**: Minimal required permissions

## Performance

### Performance Optimizations
- **Caching**: Multi-layer caching with TTL and LRU eviction
- **Database Optimization**: Query optimization and connection pooling
- **API Optimization**: Request batching and response compression
- **Frontend Performance**: Code splitting, lazy loading, virtualization
- **Cold Start Prevention**: Azure Functions warmup strategies

### Performance Monitoring
- **Response Time Tracking**: P50, P95, P99 percentiles
- **Throughput Monitoring**: Requests per second/minute
- **Error Rate Tracking**: Failed request percentage
- **Cache Hit Rate**: Cache effectiveness metrics
- **Database Performance**: Query execution time monitoring

### Performance Targets
- **API Response Time**: < 500ms (P95)
- **Page Load Time**: < 2 seconds (First Contentful Paint)
- **Cache Hit Rate**: > 80%
- **Error Rate**: < 1%
- **Uptime**: 99.9%

## Monitoring

### Monitoring Stack
- **Application Insights**: Azure-native monitoring
- **Custom Dashboards**: Real-time metrics visualization
- **Health Checks**: Automated system health monitoring
- **Log Aggregation**: Structured logging with correlation IDs

### Key Metrics
- **System Health**: CPU, Memory, Disk usage
- **Application Performance**: Response times, throughput
- **Business Metrics**: User activity, trip statistics
- **Security Metrics**: Threat detection, failed logins

### Alerting
- **Critical Alerts**: System failures, security breaches
- **Warning Alerts**: Performance degradation, high resource usage
- **Info Alerts**: Deployment notifications, maintenance windows

## Backup & Recovery

### Backup Strategy
- **Full Backups**: Daily at 2 AM UTC
- **Incremental Backups**: Every 4 hours
- **Retention**: 30 days daily, 12 weeks weekly, 12 months monthly
- **Encryption**: AES-256 encryption for all backups
- **Geographic Redundancy**: Multi-region backup storage

### Recovery Procedures
- **Recovery Time Objective (RTO)**: 1 hour
- **Recovery Point Objective (RPO)**: 15 minutes
- **Automated Recovery**: Self-healing for common issues
- **Manual Recovery**: Documented procedures for complex scenarios

### Disaster Recovery Plan
1. **Damage Assessment**: Evaluate impact and scope
2. **Service Failover**: Activate secondary Azure region
3. **Data Recovery**: Restore from latest backup
4. **Service Verification**: Validate all systems operational
5. **User Notification**: Communicate service restoration

## Troubleshooting

### Common Issues

#### Backend Issues
1. **Function Not Starting**
   - Check `local.settings.json` configuration
   - Verify Azure Functions Core Tools version
   - Check Node.js version compatibility

2. **Database Connection Failed**
   - Verify Cosmos DB connection string
   - Check network connectivity
   - Validate database permissions

3. **Authentication Errors**
   - Check JWT secret configuration
   - Verify token expiration settings
   - Validate user permissions

#### Frontend Issues
1. **API Connection Failed**
   - Verify API base URL configuration
   - Check CORS settings
   - Validate network connectivity

2. **Build Errors**
   - Check TypeScript compilation errors
   - Verify dependency versions
   - Clear node_modules and reinstall

3. **Performance Issues**
   - Check bundle size analysis
   - Verify lazy loading implementation
   - Monitor Core Web Vitals

### Debug Mode
Enable debug logging by setting environment variables:
```bash
# Backend
DEBUG=vcarpool:*

# Frontend
NEXT_PUBLIC_DEBUG=true
```

### Support Contacts
- **Technical Issues**: tech-support@vcarpool.com
- **Security Issues**: security@vcarpool.com
- **Emergency**: +1-555-EMERGENCY

## Contributing

### Code Review Process
1. Create feature branch
2. Implement changes with tests
3. Run quality checks (lint, test, build)
4. Create pull request
5. Code review and approval
6. Merge to main branch

### Quality Gates
- **Code Coverage**: Minimum 80%
- **TypeScript**: No compilation errors
- **ESLint**: No linting errors
- **Tests**: All tests passing
- **Performance**: No regressions

---

For more detailed information, refer to the specific documentation files in each module directory.
