// Test Key Vault deployment
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

// Key Vault for secrets
resource keyVault 'Microsoft.KeyVault/vaults@2021-11-01-preview' = {
  name: '${appName}-kv-${environmentName}'
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: []
    enabledForTemplateDeployment: true
    enableRbacAuthorization: false
  }
}

// Output
output keyVaultName string = keyVault.name
