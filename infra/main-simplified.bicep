// Simplified main template without Key Vault access policy
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

// Tags for all resources
var tags = {
  application: appName
  environment: environmentName
  createdBy: 'Bicep'
}

// Storage Account for Azure Functions
resource storageAccount 'Microsoft.Storage/storageAccounts@2021-08-01' = {
  name: '${replace(appName, '-', '')}sa${environmentName}'
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

// Application Insights and Log Analytics workspace
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

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${appName}-insights-${environmentName}'
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

// Azure Cosmos DB Account
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2021-10-15' = {
  name: '${appName}-cosmos-${environmentName}'
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

// Function App
resource functionApp 'Microsoft.Web/sites@2021-03-01' = {
  name: '${appName}-api-${environmentName}'
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
          value: 'temp-jwt-secret-${uniqueString(resourceGroup().id)}'
        }
        {
          name: 'JWT_REFRESH_SECRET'
          value: 'temp-refresh-secret-${uniqueString(resourceGroup().id)}'
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
          'https://${appName}-web-${environmentName}.azurestaticapps.net'
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

// Static Web App for the frontend
resource staticWebApp 'Microsoft.Web/staticSites@2021-03-01' = {
  name: '${appName}-web-${environmentName}'
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
