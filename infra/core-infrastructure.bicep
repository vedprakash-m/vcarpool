// Core infrastructure template for vCarpool
// Environment-aware deployment with optimizations for different environments

@description('Location for all resources')
param location string = resourceGroup().location

@description('App name prefix for all resources')
@allowed([
  'vcarpool'
])
param appName string = 'vcarpool'

@description('Environment name (dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string = 'dev'

@description('VNet ID for private endpoint configuration')
@allowed([
  ''
])
param vnetId string = ''

@description('Subnet name for private endpoint configuration')
param subnetName string = ''

// Environment-specific configuration
var environmentConfig = {
  sku: environmentName == 'prod' ? 'P1v2' : 'B1'
  tier: environmentName == 'prod' ? 'PremiumV2' : 'Basic'
  cosmosThroughput: environmentName == 'prod' ? 1000 : 400
  enableAutoScale: environmentName == 'prod'
  retentionDays: environmentName == 'prod' ? 90 : 30
  storageSku: 'Standard_LRS'
  functionAppRuntime: 'node:18'
  functionAppVersion: '~4'
}

// Base tags for all resources
var baseTags = {
  application: appName
  environment: environmentName
  deployment: 'bicep'
  managedBy: 'bicep'
  costCenter: 'vcarpool'
}

// Generate a unique name for storage account (max 24 chars)
var storageAccountName = toLower(take('${replace(appName, '-', '')}${environmentName}${uniqueString(resourceGroup().id)}', 24))

// Storage Account - Required for Function App and blob storage
resource storageAccount 'Microsoft.Storage/storageAccounts@2021-08-01' = {
  name: storageAccountName
  location: location
  tags: union(baseTags, {
    storageType: environmentConfig.storageSku
    autoShutdown: environmentName != 'prod' ? 'enabled' : 'disabled'
  })
  sku: {
    name: environmentConfig.storageSku
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    networkAcls: {
      defaultAction: 'Allow' // Temporarily allow all traffic during deployment
      bypass: 'AzureServices' // Allow trusted Azure services to access the storage account
      ipRules: []
      virtualNetworkRules: []
    }
    publicNetworkAccess: 'Enabled' // Enable public access for deployment
    allowSharedKeyAccess: true // Required for Function App to access storage
  }
}

// Private Endpoint for Storage Account (only if VNet ID is provided)
resource storagePrivateEndpoint 'Microsoft.Network/privateEndpoints@2021-05-01' = if (!empty(vnetId) && environmentName == 'prod') {
  name: '${storageAccount.name}-pe'
  location: location
  properties: {
    subnet: {
      id: '${vnetId}/subnets/${subnetName}'
    }
    privateLinkServiceConnections: [
      {
        name: '${storageAccount.name}-pls-conn'
        properties: {
          privateLinkServiceId: storageAccount.id
          groupIds: ['file', 'blob']
        }
      }
    ]
  }
}

// Private DNS Zone for Storage Account (only if VNet ID is provided)
var storageSuffix = environment().suffixes.storage
var privateDnsZoneName = 'privatelink.${replace(replace(storageSuffix, 'https://', ''), 'http://', '')}'

resource privateDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = if (!empty(vnetId) && environmentName == 'prod') {
  name: privateDnsZoneName
  location: 'global'
}

// Link Private DNS Zone to VNet (only if VNet ID is provided)
resource privateDnsZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = if (!empty(vnetId) && environmentName == 'prod') {
  name: '${storageAccount.name}-vnet-link'
  parent: privateDnsZone
  location: 'global'
  properties: {
    virtualNetwork: {
      id: vnetId
    }
    registrationEnabled: false
  }
}

// App Service Plan - Environment-specific SKU
resource appServicePlan 'Microsoft.Web/serverfarms@2021-03-01' = {
  name: '${appName}-plan-${environmentName}'
  location: location
  tags: union(baseTags, {
    autoShutdown: environmentName != 'prod' ? 'enabled' : 'disabled'
    environmentType: environmentName == 'prod' ? 'production' : 'non-production'
  })
  kind: 'linux'
  sku: {
    name: environmentConfig.sku
    tier: environmentConfig.tier
    capacity: environmentName == 'prod' ? 2 : 1
  }
  properties: {
    reserved: true
    targetWorkerCount: environmentName == 'prod' ? 3 : 1
    perSiteScaling: environmentName != 'prod' // Allow per-site scaling in non-prod
    maximumElasticWorkerCount: environmentName == 'prod' ? 5 : 1
  }
}

// Function App - Core backend API
resource functionApp 'Microsoft.Web/sites@2021-03-01' = {
  name: '${appName}-api-${environmentName}'
  location: location
  tags: baseTags
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
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
          value: toLower(replace('${appName}-api-${environmentName}', '.', '-'))
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
          name: 'WEBSITE_LOAD_USER_PROFILE'
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

// Assign Storage Blob Data Contributor role to Function App
// This role has fewer permissions and is easier to assign
resource storageRoleAssignment 'Microsoft.Authorization/roleAssignments@2020-10-01-preview' = {
  name: guid(functionApp.id, storageAccount.id, 'blob-data-contributor')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe') // Storage Blob Data Contributor
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
  dependsOn: [
    functionApp
    storageAccount
  ]
}

// Static Web App - Frontend
resource staticWebApp 'Microsoft.Web/staticSites@2021-03-01' = {
  name: '${appName}-web-${environmentName}'
  location: location
  tags: baseTags
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
