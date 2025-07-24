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

@description('Azure Cosmos DB account name - Static naming for idempotent deployment')
param cosmosDbAccountName string = 'carpool-db'

@description('Azure Storage Account name - Static naming for idempotent deployment')
param storageAccountName string = 'carpoolsa'

@description('Azure Key Vault name - Static naming for idempotent deployment')
param keyVaultName string = '${appName}-kv-${environmentName}'

// Tags for all resources
var tags = {
  application: appName
  environment: environmentName
  createdBy: 'Bicep'
  resourceType: 'database'
}

// Storage Account for persistent data and Azure Functions
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
        locationName: 'East US 2'  // Cosmos DB region (different from resource location)
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    enableFreeTier: false  // Disable free tier as subscription already has one
  }
}

// Key Vault for secrets management (Tech Spec naming: carpool-kv)
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: []
    enabledForDeployment: true
    enabledForTemplateDeployment: true
    enabledForDiskEncryption: true
    softDeleteRetentionInDays: 90
    enableSoftDelete: true
    enablePurgeProtection: true
  }
}

// Cosmos DB Database
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2021-10-15' = {
  parent: cosmosAccount
  name: 'carpool'
  properties: {
    resource: {
      id: 'carpool'
    }
    options: {
      throughput: 400
    }
  }
}

@description('Skip container creation if they already exist')
param skipContainerCreation bool = false

// Cosmos DB Containers - only create if not skipping
resource usersContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = if (!skipContainerCreation) {
  parent: cosmosDatabase
  name: 'users'
  properties: {
    resource: {
      id: 'users'
      partitionKey: {
        paths: ['/id']
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

resource tripsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = if (!skipContainerCreation) {
  parent: cosmosDatabase
  name: 'trips'
  properties: {
    resource: {
      id: 'trips'
      partitionKey: {
        paths: ['/driverId']
        kind: 'Hash'
      }
    }
  }
}

resource groupsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = if (!skipContainerCreation) {
  parent: cosmosDatabase
  name: 'groups'
  properties: {
    resource: {
      id: 'groups'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

resource preferencesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = if (!skipContainerCreation) {
  parent: cosmosDatabase
  name: 'preferences'
  properties: {
    resource: {
      id: 'preferences'
      partitionKey: {
        paths: ['/parentId']
        kind: 'Hash'
      }
    }
  }
}

resource notificationsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = if (!skipContainerCreation) {
  parent: cosmosDatabase
  name: 'notifications'
  properties: {
    resource: {
      id: 'notifications'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

resource schedulesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = if (!skipContainerCreation) {
  parent: cosmosDatabase
  name: 'schedules'
  properties: {
    resource: {
      id: 'schedules'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
    }
  }
}

resource swapRequestsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = if (!skipContainerCreation) {
  parent: cosmosDatabase
  name: 'swapRequests'
  properties: {
    resource: {
      id: 'swapRequests'
      partitionKey: {
        paths: ['/requesterId']
        kind: 'Hash'
      }
    }
  }
}

resource messagesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = if (!skipContainerCreation) {
  parent: cosmosDatabase
  name: 'messages'
  properties: {
    resource: {
      id: 'messages'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

resource chatsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = if (!skipContainerCreation) {
  parent: cosmosDatabase
  name: 'chats'
  properties: {
    resource: {
      id: 'chats'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

resource chatParticipantsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = if (!skipContainerCreation) {
  parent: cosmosDatabase
  name: 'chatParticipants'
  properties: {
    resource: {
      id: 'chatParticipants'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

resource emailTemplatesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = if (!skipContainerCreation) {
  parent: cosmosDatabase
  name: 'email-templates'
  properties: {
    resource: {
      id: 'email-templates'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

resource weeklyPreferencesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-10-15' = if (!skipContainerCreation) {
  parent: cosmosDatabase
  name: 'weeklyPreferences'
  properties: {
    resource: {
      id: 'weeklyPreferences'
      partitionKey: {
        paths: ['/driverParentId']
        kind: 'Hash'
      }
    }
  }
}

// Outputs for cross-resource group references
output cosmosAccountName string = cosmosAccount.name
output cosmosDatabaseName string = cosmosDatabase.name
output cosmosEndpoint string = cosmosAccount.properties.documentEndpoint
output cosmosResourceGroup string = resourceGroup().name
output storageAccountName string = storageAccount.name
output storageAccountResourceGroup string = resourceGroup().name
output keyVaultName string = keyVault.name
