/**
 * Deployment and CI/CD Optimization Configurations
 * Enhanced configurations for Azure Functions deployment and continuous integration
 */

// Azure Functions Host Configuration (host.json)
export const optimizedHostConfig = {
  version: '2.0',
  functionTimeout: '00:05:00',
  logging: {
    applicationInsights: {
      samplingSettings: {
        isEnabled: true,
        maxTelemetryItemsPerSecond: 20,
        excludedTypes: 'Request;Exception',
      },
    },
    logLevel: {
      default: 'Information',
      'Host.Results': 'Warning',
      Function: 'Information',
      'Host.Aggregator': 'Warning',
    },
  },
  aggregator: {
    batchSize: 1000,
    flushTimeout: '00:00:30',
  },
  healthMonitor: {
    enabled: true,
    healthCheckInterval: '00:00:30',
    healthCheckWindow: '00:02:00',
    healthCheckThreshold: 6,
    counterThreshold: 0.8,
  },
  httpWorkerProcess: {
    processCount: 1,
  },
  retry: {
    strategy: 'exponentialBackoff',
    maxRetryCount: 3,
    minimumInterval: '00:00:02',
    maximumInterval: '00:00:30',
  },
  extensions: {
    http: {
      routePrefix: '',
      maxConcurrentRequests: 100,
      maxOutstandingRequests: 200,
      dynamicThrottlesEnabled: true,
    },
  },
  concurrency: {
    dynamicConcurrencyEnabled: true,
    snapshotPersistenceEnabled: true,
  },
};

// Azure Functions Local Settings Template
export const localSettingsTemplate = {
  IsEncrypted: false,
  Values: {
    AzureWebJobsStorage: 'UseDevelopmentStorage=true',
    FUNCTIONS_WORKER_RUNTIME: 'node',
    FUNCTIONS_EXTENSION_VERSION: '~4',
    WEBSITE_NODE_DEFAULT_VERSION: '~18',
    NODE_ENV: 'development',

    // Performance settings
    WEBSITE_CONTENTAZUREFILECONNECTIONSTRING: '',
    WEBSITE_CONTENTSHARE: '',
    WEBSITE_RUN_FROM_PACKAGE: '1',
    WEBSITE_ENABLE_SYNC_UPDATE_SITE: 'true',

    // Monitoring
    APPINSIGHTS_INSTRUMENTATIONKEY: '',
    APPLICATIONINSIGHTS_CONNECTION_STRING: '',

    // Custom app settings
    JWT_SECRET: 'development-jwt-secret-change-in-production',
    JWT_EXPIRES_IN: '24h',
    BCRYPT_SALT_ROUNDS: '12',
    COSMOS_DB_ENDPOINT: '',
    COSMOS_DB_KEY: '',
    COSMOS_DB_DATABASE: 'carpool-dev',

    // Performance optimization
    WEBSITE_TIME_ZONE: 'UTC',
    WEBSITE_HTTPSCALEV2_ENABLED: '1',
    WEBSITE_VNET_ROUTE_ALL: '1',
  },
  Host: {
    LocalHttpPort: 7071,
    CORS: '*',
    CORSCredentials: false,
  },
};

// GitHub Actions Workflow for Optimized CI/CD
export const githubWorkflowConfig = `
name: Deploy to Azure Functions

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  AZURE_FUNCTIONAPP_NAME: 'carpool-functions'
  AZURE_FUNCTIONAPP_PACKAGE_PATH: './backend'
  NODE_VERSION: '18.x'

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json
        
    - name: Cache dependencies
      uses: actions/cache@v3
      with:
        path: |
          backend/node_modules
          ~/.npm
        key: \${{ runner.os }}-node-\${{ matrix.node-version }}-\${{ hashFiles('backend/package-lock.json') }}
        restore-keys: |
          \${{ runner.os }}-node-\${{ matrix.node-version }}-
          \${{ runner.os }}-node-
          
    - name: Install dependencies
      working-directory: backend
      run: npm ci --prefer-offline --no-audit
      
    - name: Run linting
      working-directory: backend
      run: npm run lint
      
    - name: Run type checking
      working-directory: backend
      run: npm run type-check
      
    - name: Run tests
      working-directory: backend
      run: npm run test:coverage
      
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        directory: backend/coverage
        flags: backend
        
  security-scan:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: './backend'
        format: 'sarif'
        output: 'trivy-results.sarif'
        
    - name: Upload Trivy scan results to GitHub Security tab
      uses: github/codeql-action/upload-sarif@v2
      if: always()
      with:
        sarif_file: 'trivy-results.sarif'
        
    - name: Run npm audit
      working-directory: backend
      run: npm audit --audit-level moderate
      
  build-and-deploy:
    runs-on: ubuntu-latest
    needs: [test, security-scan]
    if: github.ref == 'refs/heads/main'
    
    environment:
      name: 'production'
      url: \${{ steps.deploy.outputs.webapp-url }}
      
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: \${{ env.NODE_VERSION }}
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json
        
    - name: Install dependencies
      working-directory: backend
      run: npm ci --production --prefer-offline --no-audit
      
    - name: Build application
      working-directory: backend
      run: |
        npm run build
        npm prune --production
        
    - name: Create deployment package
      working-directory: backend
      run: |
        zip -r ../deployment.zip . -x "*.git*" "node_modules/@types/*" "src/*" "tests/*" "*.test.*" "*.spec.*"
        
    - name: Login to Azure
      uses: azure/login@v1
      with:
        creds: \${{ secrets.AZURE_CREDENTIALS }}
        
    - name: Deploy to Azure Functions
      id: deploy
      uses: Azure/functions-action@v1
      with:
        app-name: \${{ env.AZURE_FUNCTIONAPP_NAME }}
        package: 'deployment.zip'
        
    - name: Health check
      run: |
        sleep 30
        curl -f \${{ steps.deploy.outputs.webapp-url }}/api/health || exit 1
        
    - name: Run integration tests
      working-directory: backend
      env:
        API_BASE_URL: \${{ steps.deploy.outputs.webapp-url }}
      run: npm run test:integration
      
  deploy-staging:
    runs-on: ubuntu-latest
    needs: [test, security-scan]
    if: github.ref == 'refs/heads/develop'
    
    environment:
      name: 'staging'
      url: \${{ steps.deploy.outputs.webapp-url }}
      
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: \${{ env.NODE_VERSION }}
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json
        
    - name: Install dependencies
      working-directory: backend
      run: npm ci --prefer-offline --no-audit
      
    - name: Build application
      working-directory: backend
      run: npm run build
      
    - name: Login to Azure
      uses: azure/login@v1
      with:
        creds: \${{ secrets.AZURE_CREDENTIALS_STAGING }}
        
    - name: Deploy to Azure Functions (Staging)
      id: deploy
      uses: Azure/functions-action@v1
      with:
        app-name: 'carpool-functions-staging'
        package: \${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}
`;

// Package.json scripts optimization
export const optimizedPackageScripts = {
  scripts: {
    build: 'rimraf dist && tsc && npm run copy-assets',
    'build:production': 'npm run build && npm run optimize-bundle',
    'copy-assets': "copyfiles -u 1 'src/**/*.json' dist/",
    'optimize-bundle': 'npm prune --production',

    dev: 'npm run build && func start --verbose',
    start: 'func start',
    'start:production': 'NODE_ENV=production func start',

    test: 'jest',
    'test:watch': 'jest --watch',
    'test:coverage': 'jest --coverage --detectOpenHandles',
    'test:integration': 'jest --config jest.integration.config.js',
    'test:e2e': 'jest --config jest.e2e.config.js',

    lint: 'eslint src/**/*.ts --fix',
    'lint:check': 'eslint src/**/*.ts',
    'type-check': 'tsc --noEmit',

    'security:audit': 'npm audit --audit-level moderate',
    'security:check': 'npm audit --audit-level high',

    deploy: 'npm run build:production && func azure functionapp publish carpool-functions',
    'deploy:staging':
      'npm run build:production && func azure functionapp publish carpool-functions-staging',

    clean: 'rimraf dist coverage .nyc_output',
    'clean:all': 'npm run clean && rimraf node_modules package-lock.json',

    precommit: 'npm run lint && npm run type-check && npm run test',
    prepush: 'npm run test:coverage',

    'docs:generate': 'typedoc --out docs src',
    'docs:serve': 'http-server docs -p 8080',
  },
};

// ESLint configuration for performance and best practices
export const eslintConfig = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'security', 'import', 'node'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    'plugin:security/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:node/recommended',
  ],
  rules: {
    // Performance rules
    'prefer-const': 'error',
    'no-var': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',

    // Security rules
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',

    // TypeScript specific
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',

    // Import rules
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
      },
    ],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',

    // Node.js rules
    'node/no-unsupported-features/es-syntax': 'off',
    'node/no-missing-import': 'off',
    'node/no-unpublished-import': 'off',
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
};

// TypeScript configuration optimized for Azure Functions
export const tsConfigOptimized = {
  compilerOptions: {
    target: 'ES2022',
    module: 'CommonJS',
    lib: ['ES2022'],
    outDir: './dist',
    rootDir: './src',

    strict: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    forceConsistentCasingInFileNames: true,
    skipLibCheck: true,

    moduleResolution: 'node',
    resolveJsonModule: true,
    declaration: true,
    declarationMap: true,
    sourceMap: true,

    noImplicitAny: true,
    noImplicitReturns: true,
    noImplicitThis: true,
    noFallthroughCasesInSwitch: true,
    noUncheckedIndexedAccess: true,

    experimentalDecorators: true,
    emitDecoratorMetadata: true,

    baseUrl: './',
    paths: {
      '@/*': ['src/*'],
      '@shared/*': ['../shared/src/*'],
      '@tests/*': ['tests/*'],
    },

    typeRoots: ['node_modules/@types', 'src/types'],

    // Optimization options
    removeComments: true,
    preserveConstEnums: false,
    importsNotUsedAsValues: 'remove',
    isolatedModules: true,
  },
  include: ['src/**/*'],
  exclude: ['node_modules', 'dist', 'coverage', '**/*.test.ts', '**/*.spec.ts', 'tests/**/*'],
  'ts-node': {
    esm: true,
  },
};

// Docker configuration for containerized deployment
export const dockerfileConfig = `
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

FROM mcr.microsoft.com/azure-functions/node:4-node18-core-tools AS runtime

# Set environment variables
ENV AzureWebJobsScriptRoot=/home/site/wwwroot
ENV AzureFunctionsJobHost__Logging__Console__IsEnabled=true

# Copy built application
COPY --from=builder /app/dist /home/site/wwwroot
COPY --from=builder /app/node_modules /home/site/wwwroot/node_modules
COPY host.json /home/site/wwwroot/
COPY package.json /home/site/wwwroot/

# Set permissions
RUN chmod -R 755 /home/site/wwwroot

EXPOSE 80

CMD ["/azure-functions-host/Microsoft.Azure.WebJobs.Script.WebHost"]
`;

// Azure Bicep template for infrastructure as code
export const bicepTemplate = `
@description('Name of the Azure Function App')
param functionAppName string = 'carpool-functions'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Environment (dev, staging, prod)')
param environment string = 'dev'

@description('Cosmos DB account name')
param cosmosDbAccountName string = 'carpool-cosmos-\${environment}'

// Variables
var storageAccountName = 'carpoolstore\${environment}'
var appInsightsName = 'carpool-insights-\${environment}'
var hostingPlanName = 'carpool-plan-\${environment}'

// Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
    WorkspaceResourceId: logAnalyticsWorkspace.id
  }
}

// Log Analytics Workspace
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'carpool-logs-\${environment}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Hosting Plan
resource hostingPlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: hostingPlanName
  location: location
  sku: {
    name: environment == 'prod' ? 'P1v3' : 'Y1'
    tier: environment == 'prod' ? 'PremiumV3' : 'Dynamic'
  }
  properties: {
    reserved: true
  }
  kind: 'linux'
}

// Function App
resource functionApp 'Microsoft.Web/sites@2022-03-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: hostingPlan.id
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'NODE|18'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=\${storageAccount.name};EndpointSuffix=\${environment().suffixes.storage};AccountKey=\${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=\${storageAccount.name};EndpointSuffix=\${environment().suffixes.storage};AccountKey=\${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'NODE_ENV'
          value: environment
        }
        {
          name: 'COSMOS_DB_ENDPOINT'
          value: cosmosDb.properties.documentEndpoint
        }
        {
          name: 'COSMOS_DB_DATABASE'
          value: 'carpool'
        }
      ]
      cors: {
        allowedOrigins: [
          'https://portal.azure.com'
          'https://carpool-frontend-\${environment}.azurestaticapps.net'
        ]
        supportCredentials: false
      }
      use32BitWorkerProcess: false
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
  }
}

// Cosmos DB Account
resource cosmosDb 'Microsoft.DocumentDB/databaseAccounts@2022-11-15' = {
  name: cosmosDbAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    databaseAccountOfferType: 'Standard'
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
  }
}

// Key Vault for secrets
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: 'carpool-kv-\${environment}'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: functionApp.identity.principalId
        permissions: {
          secrets: ['get', 'list']
        }
      }
    ]
    enabledForTemplateDeployment: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
  }
}

// Outputs
output functionAppName string = functionApp.name
output functionAppUrl string = 'https://\${functionApp.properties.defaultHostName}'
output cosmosDbEndpoint string = cosmosDb.properties.documentEndpoint
output keyVaultName string = keyVault.name
`;

export default {
  optimizedHostConfig,
  localSettingsTemplate,
  githubWorkflowConfig,
  optimizedPackageScripts,
  eslintConfig,
  tsConfigOptimized,
  dockerfileConfig,
  bicepTemplate,
};
