// Test Static Web App deployment
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
output staticWebAppEndpoint string = 'https://${staticWebApp.properties.defaultHostname}'
output staticWebAppName string = staticWebApp.name
