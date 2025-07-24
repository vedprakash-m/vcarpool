# ADR: Thin Controller Pattern & OpenTelemetry Integration

Date: 2025-06-15

## Status
Accepted

## Context

Historically, Azure Function handlers in the backend contained mixed concerns: validation, orchestration, business logic calls, and response shaping. This created duplicated code, inconsistent error handling, and hindered unit testing. Additionally, observability was bolted on per-function and lacked a unified toggle for production deployments.

## Decision

1. Adopt a **Thin Controller** pattern for Function handlers.
   * Each handler is reduced to:
     * Request context extraction (validated body/params, auth claims)
     * Delegation to a domain **UseCase** via DI token
     * Unified success/error response building
   * Validation & auth are enforced by reusable middleware (`validateBody`, `authenticate`, etc.).
   * A generic `createFunctionHandler<TRequest, TResponse>()` factory generates handlers, further reducing boilerplate.

2. Centralise DI wiring in `container.ts`.
   * UseCase factories are registered once and resolved via string tokens from handlers.
   * Removes legacy duplicate service factories.

3. Integrate **OpenTelemetry** at bootstrap.
   * A single `initializeTelemetry()` function (guarded by `OTEL_ENABLED=true`) sets up NodeSDK with automatic instrumentation.
   * In production, traces export via OTLP HTTP → vendor-agnostic backend; in dev, a `ConsoleSpanExporter` is used.
   * Exporter package is dynamically required to avoid bundling overhead when disabled.

4. Provide **Phase-2 Optimization Middleware**.
   * Composable wrapper (`quickOptimize`, `performanceOptimize`) applies caching, compression, deduplication, and metrics to any handler with one line of code.

## Consequences

* **Pros**
  * ~45% reduction in handler LOC; easier to reason about.
  * Consistent error responses through `handleError` util.
  * End-to-end trace context for every request when telemetry enabled.
  * Observability and performance optimizations can be toggled per endpoint with minimal diff.
* **Cons**
  * Slight startup cost for OTLP exporter in production.
  * Requires developers to register new UseCases in DI container.

## Alternatives Considered

* **Keep fat controllers** – rejected due to maintainability concerns.
* **Framework-level decorators** (e.g., Nest.js). Adds heavy runtime dependency not required for small Function footprint.

## Follow-up

* Document pattern in onboarding guide.
* Add more advanced span attributes (userId, groupId) for key flows.
* Revisit exporter choice once Azure Monitor supports OTLP natively (preview Q3 2025). 