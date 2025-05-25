// Test Cosmos DB deployment
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

// Output
output cosmosDbEndpoint string = cosmosAccount.properties.documentEndpoint
