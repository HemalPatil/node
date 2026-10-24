# MC/DC Coverage Plan

This is a staged design and proof-of-concept plan. It deliberately starts
small and can be expanded as requirements become clear.

## Current coverage flow

`test flag -> Inspector precise coverage -> V8 block ranges -> coverage JSON -> Node coverage aggregation/filtering -> test:coverage event -> reporters`

Node starts detailed Inspector coverage in `src/inspector_profiler.cc`, and
currently filters files in `lib/internal/test_runner/coverage.js` after the
coverage data has crossed the Inspector boundary. Therefore, a Node flag by
itself cannot ensure that V8 instruments only selected files; that requires a
separate pre-compilation V8/embedder filtering design.

## 1. Define the POC contract: binary `||`

### 1.1 Scope

Instrument one completed binary decision, `A || B`.

### 1.2 Data to collect

The POC must distinguish these execution rows:

| A | B | Decision |
| --- | --- | --- |
| true | not evaluated | true |
| false | false | false |
| false | true | true |

Represent this as explicit MC/DC decision data, not as regular coverage
ranges. Each record needs the decision and condition source offsets, an
evaluated-condition mask, condition values, final decision value, and
optionally execution counts.

The POC calls this raw V8 data **logical evaluation-pattern coverage**. Node
derives and reports **MC/DC coverage** from it.

### 1.3 MC/DC success criterion

An MC/DC-covered decision has an independent-effect witness for every
condition:

- `A`: compare the first and second rows.
- `B`: compare the second and third rows.

The POC covers normally completed decisions only. If evaluating a condition
throws, no completed decision record is emitted and the exception does not
stand in for a condition truth value.

## 2. V8-only POC

### 2.1 Activation

Add a distinct MC/DC coverage mode, requested through an extension to
`Profiler.startPreciseCoverage`. Do not use a Node-specific V8 command-line
flag.

### 2.2 Instrumentation

Instrument `BytecodeGenerator::VisitLogicalOrExpression` while preserving
evaluation order and values exactly. Cover both bytecode-generation paths:
logical tests and expressions whose result is consumed.

### 2.3 Storage

Store MC/DC decision records alongside, but separately from, existing
`CoverageInfo` block counters. Range counts establish reachability, but cannot
reconstruct condition truth values or independent effects.

### 2.4 V8 validation

Add V8 tests for the three POC rows, counter reset behavior, repeated
execution, false-only and true-only cases, and expressions with side effects.

## 3. Inspector protocol and coverage JSON

### 3.1 Protocol model

Add an optional MC/DC payload to `Profiler.FunctionCoverage`; do not overload
`CoverageRange`. Update generated Inspector bindings and
`coverageToProtocol`.

### 3.2 Collection behavior

Verify that `Profiler.takePreciseCoverage` emits MC/DC records and resets
counters consistently with existing precise coverage.

### 3.3 Compatibility

Existing consumers must receive the unchanged range-based protocol shape when
MC/DC is disabled.

## 4. Node experimental switch

### 4.1 CLI and lifecycle

Add `--experimental-test-mcdc-coverage` as a test-runner option backed by its
own `EnvironmentOptions` boolean. Decide and document that it implies
`--experimental-test-coverage`. Ordinary coverage output must remain unchanged
when the MC/DC flag is absent.

Propagate the flag to isolated child test processes, alongside the existing
test coverage flag in `lib/internal/test_runner/runner.js`.

### 4.2 V8 integration

When the flag is enabled, request the new MC/DC Inspector/V8 mode. Keep the
V8 feature generic; Node is responsible only for selecting it.

### 4.3 Node aggregation and reporting

Extend `lib/internal/test_runner/coverage.js` to read, source-map where
possible, filter, and merge MC/DC records across test processes.

Extend the `test:coverage` summary with per-decision detail and MC/DC totals.
The common reporter seam is `getCoverageReport` in
`lib/internal/test_runner/utils.js`; the spec reporter consumes that result.

The initial report should add an `mcdc %` column. A decision counts as covered
only when every condition has an independent-effect witness. Detailed missing
condition information should remain available to custom reporters.

## 5. Source-selective instrumentation

### 5.1 Separate design gate

Treat source-selective instrumentation as a required second POC before
claiming the feature is performance-safe. Current Node filtering occurs after
V8 has collected coverage data.

### 5.2 Proposed boundary

Design a generic V8/embedder pre-compilation inclusion mechanism based on a
script origin or URL. Node supplies a policy; V8 must not implement Node glob
semantics.

### 5.3 Node policy

The policy must match Node's existing coverage selection: file URLs,
include/exclude patterns, default test-file exclusions, and `node_modules`
handling.

### 5.4 Validation

Apply selection before V8 creates source-range maps and MC/DC storage. Verify
that excluded Node internals and excluded user files receive neither MC/DC
slots nor records.

Until this is available, keep the POC global and measure its memory and runtime
cost explicitly.

## 6. Expand the language surface

### 6.1 Logical operators

Add `&&` after `||`; it uses the same Boolean MC/DC model with opposite
short-circuit behavior.

### 6.2 N-ary expressions

Add n-ary `&&` and `||` chains next. V8 has distinct n-ary visitors, so this
is not merely repeating the binary implementation.

### 6.3 Nullish coalescing and later constructs

Consider `??` separately because its atomic condition is nullishness, not
JavaScript truthiness. Defer logical assignments, optional chains, ternaries,
and nested decisions until their inclusion rules are explicit.

## 7. Validation and benchmarking

### 7.1 V8 validation

Validate execution semantics, MC/DC records, protocol serialization, and
counter reset behavior.

### 7.2 Node validation

Validate CLI parsing, process isolation, workers, custom reporters, source
maps, include/exclude rules, and `NODE_V8_COVERAGE` behavior.

### 7.3 Compatibility

Verify there are no coverage-output or behavior changes without the
experimental MC/DC flag.

### 7.4 Performance

Compare no coverage, regular coverage, global MC/DC POC, and source-filtered
MC/DC on representative test suites.
