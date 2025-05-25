// Core resources for basic infrastructure
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

// App Service Plan for Function App with Basic tier
resource appServicePlan 'Microsoft.Web/serverfarms@2021-03-01' = {
  name: '${appName}-plan-${environmentName}'
  location: location
  tags: tags
  sku: {
    name: 'B1' // Basic plan for development
    tier: 'Basic'
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
          value: 'temp-jwt-secret-${uniqueString(resourceGroup().id)}'
        }
        {
          name: 'JWT_REFRESH_SECRET'
          value: 'temp-refresh-secret-${uniqueString(resourceGroup().id)}'
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

// Output resource names for CI/CD pipeline
output functionAppName string = functionApp.name
output staticWebAppName string = staticWebApp.name
