// Test Function App deployment
@description('Location for all resources')
param location string = resourceGroup().location

@description('App name that will be used as prefix for all resources')
param appName string = 'vcarpool'

@description('Environment name (dev, test, prod)')
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
          name: 'JWT_SECRET'
          value: 'temp-jwt-secret'
        }
        {
          name: 'JWT_REFRESH_SECRET'
          value: 'temp-refresh-secret'
        }
      ]
      cors: {
        allowedOrigins: [
          'http://localhost:3000'
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

// Outputs
output functionAppEndpoint string = 'https://${functionApp.properties.defaultHostName}/api'
output functionAppName string = functionApp.name
