# A9: Observability with OpenTelemetry and Jaeger

An Express + MongoDB todo service instrumented with OpenTelemetry. Traces go to Jaeger over OTLP and to the console, and metrics go to the console.

## Prerequisites

- Node.js 18 or newer
- Docker Desktop, running

## Run it

```bash
npm install

# MongoDB
docker run -d --name mongo -p 27017:27017 mongo

# Jaeger (all-in-one, OTLP receiver on 4317/4318, UI on 16686)
docker run -d --name jaeger -p 16686:16686 -p 4317:4317 -p 4318:4318 -p 5778:5778 -p 9411:9411 jaegertracing/jaeger:2.5.0

# Start the service with tracing loaded first
node --require ./tracing.js index.js
```

In a second terminal, generate some traffic:

```bash
curl http://localhost:3000/todo
curl http://localhost:3000/todo/1
```

Open http://localhost:16686, choose **todo-service** under Service, and click **Find Traces**.

## Files

- `index.js`: Express server with `GET /todo` and `GET /todo/:id`, backed by MongoDB. It seeds three todos the first time it runs.
- `tracing.js`: OpenTelemetry SDK setup. It must be loaded with `--require` so instrumentation patches `http`, `express` and `mongodb` before the app imports them.

## Changes from the starter code

- **Exporter:** The console-only span exporter was replaced with the OTLP/HTTP exporter (`http://localhost:4318/v1/traces`), which Jaeger v2 accepts natively. The console exporter is kept alongside it so raw span data still prints. The deprecated `@opentelemetry/exporter-jaeger` isn't used.
- **Instrumentations:** HTTP, Express and MongoDB are instrumented once, through `getNodeAutoInstrumentations()`. The starter code also registered each one separately, which wraps the same modules twice. `fs` instrumentation is turned off to keep traces readable.
- **Dependencies:** `package.json` now lists every package `tracing.js` imports. The original list was missing `resources`, `semantic-conventions`, `sdk-metrics` and the OTLP exporter. SDK versions are pinned to one matching release line (`sdk-node` 0.200.0 / core 2.0.0).
- **Seeding:** Sample data is inserted only when the collection is empty, so restarts don't create duplicates.
- **Shutdown:** Ctrl+C flushes pending spans before the process exits.
- **Metrics:** Metrics export to the console every 10 seconds instead of every 60.
