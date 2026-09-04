# json-transform-service

## Overview

A small HTTP service that accepts any valid JSON value and replaces every string value exactly equal to `"dog"` with `"cat"`. Matching is case-sensitive, applies only to string values (never object keys), and the number of replacements per request can be capped by server-side configuration.

## Prerequisites

- Node.js >= 20.19 (an `.nvmrc` targeting Node 22 is provided)
- npm

## Installation

```sh
npm ci
```

## Running locally

Development mode with automatic reload:

```sh
npm run dev
```

Compiled production build:

```sh
npm run build
npm start
```

The server listens on `0.0.0.0:3000` by default.

## API

### POST /transform

- Request `Content-Type`: `application/json`
- Body: any valid JSON value — object, array, string, number, boolean, or null
- Response: the same JSON value with qualifying `"dog"` string values replaced by `"cat"`

Replacement rules:

| Input         | Output        |
| ------------- | ------------- |
| `"dog"`       | `"cat"`       |
| `"Dog"`       | `"Dog"`       |
| `"DOG"`       | `"DOG"`       |
| `"dogs"`      | `"dogs"`      |
| `"hotdog"`    | `"hotdog"`    |
| `"dog house"` | `"dog house"` |

Object property names are never transformed:

```json
{ "dog": "dog" }
```

becomes

```json
{ "dog": "cat" }
```

Error responses:

- `400` for malformed JSON
- `413` for request bodies larger than the configured limit

## curl example

```sh
curl -X POST http://localhost:3000/transform \
  -H 'Content-Type: application/json' \
  -d '{"dog": "dog", "pets": ["dog", "Dog", {"kind": "dog"}]}'
```

Response:

```json
{ "dog": "cat", "pets": ["cat", "Dog", { "kind": "cat" }] }
```

## Configuration

All configuration is provided through environment variables and validated at startup. Invalid values (including malformed numbers such as `10abc`) cause the process to exit with a clear error.

| Variable           | Default            | Constraints                 |
| ------------------ | ------------------ | --------------------------- |
| `PORT`             | `3000`             | integer between 1 and 65535 |
| `HOST`             | `0.0.0.0`          | non-empty string            |
| `MAX_REPLACEMENTS` | `9007199254740991` | non-negative safe integer   |
| `MAX_BODY_BYTES`   | `1048576` (1 MiB)  | positive safe integer       |

`MAX_REPLACEMENTS=0` is valid and disables replacement entirely. The default is effectively unlimited.

Example:

```sh
MAX_REPLACEMENTS=5 MAX_BODY_BYTES=65536 PORT=8080 npm start
```

## Testing

```sh
npm test
npm run test:watch
```

Tests cover the transformation engine, configuration validation, and the HTTP layer. HTTP tests use Fastify's `inject()` and never open a network socket.

## Quality commands

```sh
npm run typecheck
npm run lint
npm run format
npm run format:check
npm run check
```

`npm run check` runs typecheck, lint, format check, and the test suite.

## Design decisions

- **Separation of concerns.** `config.ts` parses and validates the environment, `transform.ts` holds pure transformation logic with no Fastify dependency, `app.ts` builds the Fastify application from a validated config, and `index.ts` only starts the process.
- **Exact value matching.** Only string values strictly equal to `"dog"` are replaced. Substring or case-insensitive matching would silently corrupt unrelated data such as `"hotdog"` or `"Dog"`.
- **Values only, never keys.** Renaming object keys would change the shape of the document and break consumers that address fields by name.
- **Deterministic traversal.** Values are visited in left-to-right depth-first order (array index order; object property enumeration order). Combined with the replacement cap, the same input and configuration always produce the same output.
- **Iterative traversal with an explicit stack.** Recursion depth in JavaScript is bounded by the call stack, so deeply nested input could crash a recursive implementation. The explicit stack handles arbitrary nesting; children are pushed in reverse so pop order remains left-to-right.
- **Request-scoped in-place transformation.** The parsed request body is owned by the request, so matched values are written back through their parent container instead of deep-cloning the structure. This avoids doubling memory per request.
- **Server-side replacement limit.** `MAX_REPLACEMENTS` is a deployment decision, not a client decision, so it is not accepted from the request. Traversal stops immediately once the limit is reached.
- **Body size protection.** Fastify's `bodyLimit` is set from `MAX_BODY_BYTES`, rejecting oversized payloads with `413` before they are parsed.
- **Fail-fast configuration.** Malformed configuration terminates startup with a non-zero exit code rather than running with silently coerced values.

## Complexity

Time complexity is O(n) in the number of JSON values inspected; each value is visited at most once. Traversal stops early when the replacement limit is reached. Auxiliary memory is the explicit traversal stack, bounded by the size of the input; no copy of the document is made.

## High-traffic considerations

- The service is stateless with no cross-request mutable state, so instances can be replicated horizontally behind a load balancer without coordination.
- Each request is processed independently and synchronously with no external calls, no persistence, and no avoidable serialization or copying.
- The body size limit bounds per-request memory and parse cost.
- Concerns such as TLS termination, rate limiting, and load balancing are intentionally left to surrounding infrastructure.

## Assumptions

- Request bodies are UTF-8 JSON delivered with `Content-Type: application/json`.
- The response should be the transformed value itself, with no envelope; the replacement count is computed internally but not exposed over HTTP.
- The default replacement limit should not restrict behavior unless explicitly configured.
- The service runs behind infrastructure that handles TLS, authentication, and rate limiting if required.

## Trade-offs

- **Exact matching vs. substring matching.** Exact matching is predictable and lossless for non-matching strings; substring replacement was rejected as unsafe.
- **Values vs. keys.** Keys are preserved to keep document structure stable.
- **Iteration vs. recursion.** Iteration costs slightly more code but removes the call-stack depth ceiling.
- **In-place mutation vs. cloning.** Mutation is safe here because the parsed body is request-scoped; cloning would be required if the input were shared.
- **Deterministic traversal with an early stop.** A capped request yields a predictable prefix of replacements rather than an arbitrary subset.
- **Server-side limit.** Clients cannot lift the cap per request; changing it requires redeployment or restart, which is acceptable for an operational safety control.
- **No external infrastructure.** Databases, caches, and queues add operational burden with no benefit for a pure per-request computation.

## What I would do with more time

- Benchmarking and load testing to quantify throughput and latency under realistic payloads
- Health and readiness endpoints for orchestrated deployments
- Structured metrics and request tracing
- A defined production logging policy
- Rate limiting guidance or an optional plugin
- A CI workflow running the full check suite
- Container build and deployment configuration
