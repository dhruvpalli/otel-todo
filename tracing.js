// OpenTelemetry setup for todo-service.
// Load before the app: node --require ./tracing.js index.js
//
// Traces go to two places:
//   1. Jaeger, over OTLP/HTTP (http://localhost:4318/v1/traces)
//   2. The console, so you can read raw span data in the terminal
// Metrics go to the console every 10 seconds (Jaeger only stores traces).

const { resourceFromAttributes } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  BatchSpanProcessor,
} = require('@opentelemetry/sdk-trace-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const {
  ConsoleMetricExporter,
  PeriodicExportingMetricReader,
} = require('@opentelemetry/sdk-metrics');

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'todo-service',
  }),

  spanProcessors: [
    // Replaces the original ConsoleSpanExporter-only setup.
    new BatchSpanProcessor(
      new OTLPTraceExporter({ url: 'http://localhost:4318/v1/traces' })
    ),
    new SimpleSpanProcessor(new ConsoleSpanExporter()),
  ],

  metricReader: new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(),
    exportIntervalMillis: 10000,
  }),

  // Auto-instrumentations already cover HTTP, Express and MongoDB, so the
  // separate HttpInstrumentation / ExpressInstrumentation / MongoDBInstrumentation
  // from the starter code are not registered again (that would double-wrap
  // the same modules). fs is disabled because it floods traces with file reads.
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

// Flush pending spans and metrics when the server is stopped with Ctrl+C.
const shutdown = () => {
  sdk
    .shutdown()
    .catch((err) => console.error('Error shutting down OpenTelemetry', err))
    .finally(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
