// Core infrastructure template for CI/CD pipeline
// This template focuses on the minimum required resources for a successful deployment
// It deliberately avoids complex dependencies and uses simple resource configurations

@description('Location for all resources')
param location string = resourceGroup().location

@description('App name prefix for all resources')
param appName string = 'vcarpool'

@description('Environment name (dev, test, prod)')
param environmentName string = 'dev'

// Tags for all resources
var tags = {
  application: appName
  environment: environmentName
  deployment: 'ci-cd'
}

// Storage Account - Required for Function App and blob storage
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

// App Service Plan - Using B1 SKU which has wider availability
resource appServicePlan 'Microsoft.Web/serverfarms@2021-03-01' = {
  name: '${appName}-plan-${environmentName}'
  location: location
  tags: tags
  kind: 'linux'
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  properties: {
    reserved: true
  }
}

// Function App - Core backend API
resource functionApp 'Microsoft.Web/sites@2021-03-01' = {
  name: '${appName}-api-${environmentName}'
  location: location
  tags: tags
  kind: 'functionapp,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'Node|18'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${listKeys(storageAccount.id, '2021-08-01').keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${listKeys(storageAccount.id, '2021-08-01').keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower('${appName}-api-${environmentName}')
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
    }
  }
}

// Static Web App - Frontend
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

// Add CORS between the function app and static web app
resource functionAppConfig 'Microsoft.Web/sites/config@2021-03-01' = {
  parent: functionApp
  name: 'web'
  properties: {
    cors: {
      allowedOrigins: [
        'https://${staticWebApp.properties.defaultHostname}'
        'http://localhost:3000'
      ]
      supportCredentials: true
    }
  }
}

// Output important information needed by CI/CD pipeline
output functionAppName string = functionApp.name
output functionAppEndpoint string = 'https://${functionApp.properties.defaultHostName}/api'
output staticWebAppName string = staticWebApp.name
output staticWebAppEndpoint string = 'https://${staticWebApp.properties.defaultHostname}'
