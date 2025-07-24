const { CosmosClient } = require('@azure/cosmos');
const UnifiedResponseHandler = require('../src/utils/unified-response.service');

let container;
if (process.env.COSMOSDB_CONNECTION_STRING) {
  const client = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);
  const db = client.database(process.env.COSMOSDB_DATABASE || 'carpool');
  container = db.container(process.env.COSMOSDB_PUSH_CONTAINER || 'push_subscriptions');
}

module.exports = async function (context, req) {
  if (req.method === 'OPTIONS') {
    context.res = UnifiedResponseHandler.preflight();
    return;
  }
  if (req.method !== 'POST') {
    context.res = UnifiedResponseHandler.methodNotAllowedError();
    return;
  }

  const { userId, subscription } = req.body || {};
  if (!userId || !subscription) {
    context.res = UnifiedResponseHandler.validationError('userId and subscription required');
    return;
  }

  try {
    if (container) {
      await container.items.upsert({ id: userId, subscription });
    }
    context.res = UnifiedResponseHandler.success({ message: 'Subscription stored' });
  } catch (err) {
    context.log.error('Error storing push subscription', err);
    context.res = UnifiedResponseHandler.internalError();
  }
};
