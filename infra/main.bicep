@description('Location for all resources')
param location string = resourceGroup().location

@description('App name that will be used as prefix for all resources')
param appName string = 'vcarpool'

@description('Environment name (dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string = 'dev'

@description('Azure Cosmos DB account name')
param cosmosDbAccountName string = '${appName}-cosmos-${environmentName}'

@description('Azure Function App name')
param functionAppName string = '${appName}-api-${environmentName}'

@description('Azure Static Web App name')
param staticWebAppName string = '${appName}-web-${environmentName}'

@description('Azure Application Insights name')
param appInsightsName string = '${appName}-insights-${environmentName}'

@description('Azure Storage Account name')
param storageAccountName string = '${replace(appName, '-', '')}sa${environmentName}'

// Tags for all resources
var tags = {
  application: appName
  environment: environmentName
  createdBy: 'Bicep'
}

// Storage Account for Azure Functions
resource storageAccount 'Microsoft.Storage/storageAccounts@2021-08-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
  }
}

// Application Insights for monitoring
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logWorkspace.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Log Analytics workspace for Application Insights
resource logWorkspace 'Microsoft.OperationalInsights/workspaces@2021-06-01' = {
  name: '${appName}-logs-${environmentName}'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// App Service Plan for Function App
resource appServicePlan 'Microsoft.Web/serverfarms@2021-03-01' = {
  name: '${appName}-plan-${environmentName}'
  location: location
  tags: tags
  sku: {
    name: 'Y1' // Consumption plan
    tier: 'Dynamic'
  }
  properties: {
    reserved: true // Required for Linux
  }
}

// Function App
resource functionApp 'Microsoft.Web/sites@2021-03-01' = {
  name: functionAppName
  location: location
  tags: tags
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~18'
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'COSMOS_DB_ENDPOINT'
          value: cosmosAccount.properties.documentEndpoint
        }
        {
          name: 'COSMOS_DB_KEY'
          value: cosmosAccount.listKeys().primaryMasterKey
        }
        {
          name: 'COSMOS_DB_DATABASE_ID'
          value: 'vcarpool'
        }
        {
          name: 'JWT_SECRET'
          value: 'temp-jwt-secret' // Will be updated via Key Vault reference after deployment
        }
        {
          name: 'JWT_REFRESH_SECRET'
          value: 'temp-refresh-secret' // Will be updated via Key Vault reference after deployment
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
      ]
      cors: {
        allowedOrigins: [
          'https://${staticWebAppName}.azurestaticapps.net'
          'http://localhost:3000' // For local development
        ]
        supportCredentials: true
      }
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      nodeVersion: '~18'
    }
    httpsOnly: true
  }
}

// Azure Cosmos DB Account
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2021-10-15' = {
  name: cosmosDbAccountName
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    enableFreeTier: environmentName != 'prod'
  }
}

// Cosmos DB Database
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2021-10-15' = {
  name: '${cosmosAccount.name}/vcarpool'
  properties: {
    resource: {
      id: 'vcarpool'
    }
    options: {
      throughput: 400
    }
  }
}

// Cosmos DB Containers
resource usersContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = {
  name: '${cosmosDatabase.name}/users'
  properties: {
    resource: {
      id: 'users'
      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/"_etag"/?'
          }
        ]
      }
    }
  }
}

resource tripsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = {
  name: '${cosmosDatabase.name}/trips'
  properties: {
    resource: {
      id: 'trips'
      partitionKey: {
        paths: [
          '/driverId'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/"_etag"/?'
          }
        ]
      }
    }
  }
}

resource schedulesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = {
  name: '${cosmosDatabase.name}/schedules'
  properties: {
    resource: {
      id: 'schedules'
      partitionKey: {
        paths: [
          '/userId'
        ]
        kind: 'Hash'
      }
    }
  }
}

resource swapRequestsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = {
  name: '${cosmosDatabase.name}/swap-requests'
  properties: {
    resource: {
      id: 'swap-requests'
      partitionKey: {
        paths: [
          '/requesterId'
        ]
        kind: 'Hash'
      }
    }
  }
}

resource emailTemplatesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = {
  name: '${cosmosDatabase.name}/email-templates'
  properties: {
    resource: {
      id: 'email-templates'
      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
      }
    }
  }
}

// Key Vault for secrets
resource keyVault 'Microsoft.KeyVault/vaults@2021-11-01-preview' = {
  name: '${appName}-kv-${environmentName}'
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: [] // Access policies will be added separately to avoid circular dependency
    enabledForTemplateDeployment: true
    enableRbacAuthorization: false
  }
}

// Key Vault Access Policy for Function App (separate resource to avoid circular dependency)
resource keyVaultAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2021-11-01-preview' = {
  parent: keyVault
  name: 'add'
  properties: {
    accessPolicies: [
      {
        objectId: functionApp.identity.principalId
        tenantId: subscription().tenantId
        permissions: {
          secrets: [
            'get'
            'list'
          ]
        }
      }
    ]
  }
}

// Static Web App for the frontend
resource staticWebApp 'Microsoft.Web/staticSites@2021-03-01' = {
  name: staticWebAppName
  location: location
  tags: tags
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    provider: 'GitHub'
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
  }
}

// Output the endpoints for reference
output functionAppEndpoint string = 'https://${functionApp.properties.defaultHostName}/api'
output staticWebAppEndpoint string = 'https://${staticWebApp.properties.defaultHostname}'
output cosmosDbEndpoint string = cosmosAccount.properties.documentEndpoint

// Output resource names for CI/CD pipeline
output functionAppName string = functionApp.name
output staticWebAppName string = staticWebApp.name
