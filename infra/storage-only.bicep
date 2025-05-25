// Storage account only
param location string = resourceGroup().location

resource storageAccount 'Microsoft.Storage/storageAccounts@2021-08-01' = {
  name: 'vcarpoolsadev'
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

output storageName string = storageAccount.name
