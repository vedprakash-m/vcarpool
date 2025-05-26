# vCarpool CI/CD Workflows

This directory contains GitHub Actions workflows for the vCarpool application.

## Workflows

### 1. Build and Test (`build.yml`)

Runs on every push to `main` or `develop` branches, and on pull requests.

**Jobs:**
- `setup`: Determines the environment and sets up necessary variables
- `install-dependencies`: Installs root and shared dependencies
- `shared-build`: Builds the shared library
- `backend-build`: Builds and tests the backend
- `frontend-build`: Builds and tests the frontend
- `integration-tests`: Runs end-to-end tests

### 2. Deploy (`deploy.yml`)

**Trigger**: After a successful build workflow run

**Purpose**: Deploy the application to Azure

**Jobs**:
- **check-build**: Verifies the build was successful
- **deploy-infrastructure**: Deploys infrastructure components
- **deploy-backend**: Deploys the backend to Azure Functions
- **deploy-frontend**: Deploys the frontend to Azure Static Web Apps
- **smoke-test**: Runs smoke tests after deployment

### 3. Release Workflow (`release.yml`)

**Trigger**: When a new tag is pushed (matching `v*`)

**Purpose**: Create GitHub releases and publish packages

**Jobs**:
- **release**: Creates a GitHub release and publishes to NPM
  - Validates the package
  - Checks for existing versions
  - Publishes with provenance for supply chain security

### 4. Cleanup Workflow (`cleanup.yml`)

**Schedule**: Weekly on Sundays at 1 AM

**Purpose**: Clean up old workflow runs and artifacts

**Jobs**:
- **cleanup-artifacts**: Removes old workflow artifacts, keeping the 5 most recent
- **cleanup-workflow-runs**: Removes old workflow runs, keeping the 5 most recent per workflow

## Reusable Workflows

### Node.js Setup (`reusable/node-setup.yml`)

A reusable workflow that:
- Sets up Node.js with the specified version
- Configures npm caching
- Installs dependencies
- Sets up the working directory

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|:--------:|
| `NODE_VERSION` | Node.js version | `18.x` | No |
| `AZURE_FUNCTIONAPP_NAME` | Azure Function App name | - | Yes |
| `AZURE_STATICWEBAPP_NAME` | Azure Static Web App name | - | Yes |
| `BACKEND_WORKING_DIR` | Backend directory | `./backend` | No |
| `FRONTEND_WORKING_DIR` | Frontend directory | `./frontend` | No |
| `SHARED_WORKING_DIR` | Shared library directory | `./shared` | No |
| `INFRASTRUCTURE_WORKING_DIR` | Infrastructure directory | `./infra` | No |

## Secrets

| Secret | Description | Required For |
|--------|-------------|:------------:|
| `AZURE_CREDENTIALS` | Azure service principal credentials | Deployment |
| `NPM_TOKEN` | NPM authentication token | Publishing packages |
| `E2E_TEST_SECRETS` | End-to-end test secrets | E2E Testing |

## Best Practices

### 1. Branch Protection
- Require status checks to pass before merging
- Require linear history
- Include administrators in branch protection rules
- Require pull request reviews before merging
- Restrict who can push to protected branches

### 2. Dependencies Management
- Use `npm ci` for consistent installations in CI
- Cache `node_modules` and build outputs
- Pin dependency versions for reproducibility
- Use Dependabot for automated dependency updates
- Regularly audit dependencies for security vulnerabilities

### 3. Security
- Use GitHub secrets for all sensitive data
- Implement the principle of least privilege for secrets
- Enable Dependabot security updates
- Use code scanning and dependency scanning
- Keep GitHub Actions and other tools up to date

### 4. NPM Publishing
- Use `NODE_AUTH_TOKEN` environment variable for authentication
- Configure scoped packages with proper registry settings
- Enable provenance for supply chain security
- Implement version checking to avoid duplicate publishes
- Use the `--access public` flag for public packages

### 5. Performance Optimization
- Run independent jobs in parallel
- Use matrix builds for multiple configurations
- Cache dependencies between workflow runs
- Set appropriate timeouts for long-running jobs
- Clean up unnecessary artifacts and caches

### 6. Maintainability
- Use descriptive job and step names
- Add comments for complex logic
- Keep workflows focused and modular
- Document environment variables and secrets
- Use reusable workflows for common patterns

### 7. Monitoring and Notifications
- Set up workflow status badges in README
- Configure notifications for workflow failures
- Monitor workflow run times and optimize as needed
- Set up status checks for required workflows
- Document common issues and their resolutions
