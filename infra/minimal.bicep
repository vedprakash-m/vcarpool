// Minimal template with just storage and function app
@description('Location for all resources')
param location string = resourceGroup().location

@description('App name')
param appName string = 'vcarpool'

@description('Environment name')
param envName string = 'dev'

// Storage Account for Azure Functions
resource storageAccount 'Microsoft.Storage/storageAccounts@2021-08-01' = {
  name: '${replace(appName, '-', '')}sa${envName}'
  location: location
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
  name: '${appName}-plan-${envName}'
  location: location
  sku: {
    name: 'B1' // Basic plan
    tier: 'Basic'
  }
  properties: {
    reserved: true // Required for Linux
  }
}

// Function App
resource functionApp 'Microsoft.Web/sites@2021-03-01' = {
  name: '${appName}-api-${envName}'
  location: location
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
      ]
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      nodeVersion: '~18'
    }
    httpsOnly: true
  }
}

// Output the endpoint for reference
output functionAppEndpoint string = 'https://${functionApp.properties.defaultHostName}/api'
output functionAppName string = functionApp.name
