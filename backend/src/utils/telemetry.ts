import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

let sdk: NodeSDK | undefined;

export function initializeTelemetry() {
  if (process.env.OTEL_ENABLED !== 'true') {
    // eslint-disable-next-line no-console
    console.log('OpenTelemetry disabled via OTEL_ENABLED env var');
    return;
  }

  if (sdk) return; // already initialized

  try {
    // Use minimal configuration to avoid import conflicts
    // Exclude Redis instrumentation to reduce dependencies and costs
    sdk = new NodeSDK({
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-redis': {
            enabled: false,
          },
          '@opentelemetry/instrumentation-redis-4': {
            enabled: false,
          },
          '@opentelemetry/instrumentation-ioredis': {
            enabled: false,
          },
        }),
      ],
    });

    // Start the SDK
    void (sdk as any).start();
    // eslint-disable-next-line no-console
    console.log('OpenTelemetry initialized');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('OpenTelemetry initialization failed', err);
  }
}

export function shutdownTelemetry() {
  if (sdk) {
    void (sdk as any).shutdown();
    sdk = undefined;
  }
}
