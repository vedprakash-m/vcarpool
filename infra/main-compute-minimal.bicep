@description('Location for all resources')
param location string = resourceGroup().location

@description('App name that will be used as prefix for all resources')
param appName string = 'carpool'

@description('Environment name (dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string = 'dev'

@description('Azure Function App name - Static naming for idempotent deployment')
param functionAppName string = 'carpool-api'

@description('Azure Static Web App name - Static naming for idempotent deployment')
param staticWebAppName string = 'carpool-web'

@description('Azure Application Insights name - Static naming for idempotent deployment')
param appInsightsName string = 'carpool-insights'

@description('Azure Key Vault name - Static naming for idempotent deployment')
param keyVaultName string = '${appName}-kv-${environmentName}'

// Database resource group and resource details (from database deployment)
@description('Database resource group name')
param databaseResourceGroup string = 'carpool-db-rg'

@description('Cosmos DB account name from database resource group - Static naming')
param cosmosDbAccountName string = 'carpool-db'

@description('Storage Account name from database resource group - Static naming')
param storageAccountName string = 'carpoolsa'

// Tags for all resources
var tags = {
  application: appName
  environment: environmentName
  createdBy: 'Bicep'
  resourceType: 'compute'
}

// Application Service Plan
resource hostingPlan 'Microsoft.Web/serverfarms@2021-03-01' = {
  name: 'carpool-plan'
  location: location
  tags: tags
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
    size: 'Y1'
    family: 'Y'
    capacity: 0
  }
  properties: {}
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
  }
}

// Azure Function App - MINIMAL VERSION WITHOUT ARM API CALLS
resource functionApp 'Microsoft.Web/sites@2021-03-01' = {
  name: functionAppName
  location: location
  tags: tags
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: hostingPlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};EndpointSuffix=${environment().suffixes.storage};AccountKey=PLACEHOLDER'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};EndpointSuffix=${environment().suffixes.storage};AccountKey=PLACEHOLDER'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(functionAppName)
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
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
          name: 'COSMOS_DB_CONNECTION_STRING'
          value: 'AccountEndpoint=https://${cosmosDbAccountName}.documents.azure.com:443/;AccountKey=PLACEHOLDER;'
        }
        {
          name: 'COSMOS_DB_ENDPOINT'
          value: 'https://${cosmosDbAccountName}.documents.azure.com:443/'
        }
        {
          name: 'COSMOS_DB_KEY'
          value: 'PLACEHOLDER'
        }
        {
          name: 'ENVIRONMENT'
          value: environmentName
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
      ]
      ftpsState: 'FtpsOnly'
      minTlsVersion: '1.2'
      http20Enabled: true
      cors: {
        allowedOrigins: [
          'https://portal.azure.com'
          'https://${staticWebApp.properties.defaultHostname}'
        ]
        supportCredentials: false
      }
    }
    httpsOnly: true
  }
}

// Azure Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2021-03-01' = {
  name: staticWebAppName
  location: 'East US 2' // Static Web Apps are limited to certain regions
  tags: tags
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: 'https://github.com/vedprakash-m/carpool'
    branch: 'main'
    buildProperties: {
      appLocation: '/frontend'
      apiLocation: ''
      outputLocation: 'out'
    }
  }
}

// Outputs
output functionAppName string = functionApp.name
output functionAppDefaultHostName string = functionApp.properties.defaultHostName
output staticWebAppName string = staticWebApp.name
output staticWebAppDefaultHostName string = staticWebApp.properties.defaultHostname
output storageAccountName string = storageAccountName
output appInsightsName string = appInsights.name
output keyVaultName string = keyVaultName
output cosmosDbAccountName string = cosmosDbAccountName
output cosmosDbEndpoint string = 'https://${cosmosDbAccountName}.documents.azure.com:443/'
