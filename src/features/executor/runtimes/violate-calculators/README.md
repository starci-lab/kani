# Violate calculators

This module evaluates **violate indicators** for a bot: it computes numeric signals (e.g. price change %, regression slope, R²) over a time window and checks them against configurable **trigger** and **reentry** thresholds. The result is a status: **Trigger**, **Reentry**, or **NoAction**.

It is used by `HandleViolateIndicatorsService`: when a bot has an active position, each of its `violateIndicators` is run through the matching calculator; the handler can then act on the returned status (e.g. trigger = violation, reentry = safe to re-enter).

---

## Overview

- **Input**: A bot, and one violate indicator config (type, time window, trigger/reentry thresholds).
- **Output**: `IndicatorResult<T> | null`: `status` (Trigger | Reentry | NoAction), `timeWindowMs`, and `metadata` (e.g. `pct`, `r2`). `null` when the calculator cannot run (e.g. missing tokens or price data).

Each indicator is defined in the database with:

- **`type`**: `PricePct` | `PriceRegression` | `VolumeSpike` (VolumeSpike not implemented).
- **`timeWindowMs`**: How far back to look for price data.
- **`triggerThresholds`**: Array of conditions `{ name, op, value }`. If **all** are satisfied (AND), the result is **Trigger** (violation).
- **`reentryThresholds`**: Same shape. If all are satisfied, the result is **Reentry** (e.g. safe to re-enter).

Evaluation order: **trigger** is checked first; if not met, **reentry** is checked; if neither, **NoAction**.

---

## Thresholds and OpService

Thresholds are arrays of **conditions**:

- **`name`**: Which indicator value to use (`IndicatorName.Pct`, `IndicatorName.R2`, etc.).
- **`op`**: Comparison (`Operation`: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`).
- **`value`**: Number to compare against.

**OpService**:

- **`evaluate(currentValue, op, thresholdValue)`**: Returns whether the single condition holds.
- **`evaluateAll(values, thresholds)`**: Builds a map of indicator name → current value (e.g. `{ pct: 0.02, r2: 0.9 }`). Returns `true` only if **every** condition in `thresholds` is satisfied (AND). If a condition refers to a name not in `values`, it is treated as not satisfied.

So calculators: (1) compute one or more numbers (pct, r2), (2) put them in `values`, (3) call `opService.evaluateAll(values, triggerThresholds)` and `opService.evaluateAll(values, reentryThresholds)` to decide the status.

---

## Calculators

### PricePct (`PctCalculatorService`)

- **Purpose**: Percentage change of the **relative price** (target/quote) over the time window.
- **Flow**:
  1. Resolve target and quote tokens; reject if both are USDT.
  2. Get a **relative price series** for the pair (see “Relative price” below) over `timeWindowMs`.
  3. Take first and last point; compute `pct = |(lastPrice / firstPrice) - 1|`.
  4. Set `values = { [IndicatorName.Pct]: pct }`, then run trigger/reentry via `OpService.evaluateAll`.
- **Result metadata**: `{ pct }`.

### PriceRegression (`RegressionCalculatorService`)

- **Purpose**: Linear regression on the relative price series; use **slope** (as a percentage over the window) and **R²** (fit quality).
- **Flow**:
  1. Same token and relative-price resolution as PricePct.
  2. Sort points by time; build `data = [[time, price], ...]`.
  3. Use `simple-statistics`: `linearRegression(data)` → slope `m`, then `rSquared(data, line)` → R².
  4. `pctValue = |(m * timeSpan) / firstPrice|`; `values = { [IndicatorName.Pct]: pctValue, [IndicatorName.R2]: r2Value }`.
  5. Evaluate trigger/reentry with `OpService.evaluateAll`.
- **Result metadata**: `{ pct, r2 }`.

### VolumeSpike

- Not implemented; handler returns `null` for this type.

---

## Relative price

Relative price = “target token in units of quote token” (e.g. TOKEN/USDC). It is built in three ways:

1. **Target is USDT**: Fetch quote token price in USDT → that series is the relative price (quote in USDT = target/quote when target = USDT).
2. **Quote is USDT**: Fetch target token price in USDT, then invert: `1 / price` → relative price.
3. **Neither USDT**: Use `RelativePriceBuilderService.buildRelativePrice(tokenA=target, tokenB=quote, …)`: for each target price point, interpolate quote price at the same time and take target/quote.

CEX choice for each token comes from token config + optional cache (`CacheKey.ActivePriceCex`). Price series are read from `InfluxdbPriceCacheService` (in-memory cache filled from InfluxDB).

---

## Types (summary)

- **`IndicatorStatus`**: `Trigger` | `Reentry` | `NoAction`.
- **`IndicatorResult<T>`**: `{ status, timeWindowMs, metadata: T }`.
- **`PricePctIndicatorResult`**: `metadata = { pct }`.
- **`PriceRegressionIndicatorResult`**: `metadata = { pct, r2 }`.
- **`GetPointsParams` / `BuildRelativePriceParams`**: Used by the cache and relative-price builder (see `types/influxdb-cache.ts`, `types/relative-price.ts`).

---

## Folder structure

- **`op.service.ts`**: Threshold evaluation (single condition + evaluateAll).
- **`prices/`**: `PctCalculatorService`, `RegressionCalculatorService`, `RelativePriceBuilderService`.
- **`influxdb-cache/`**: In-memory price (and volume) cache used by the calculators.
- **`types/`**: Indicator result types, status enum, and shared types for cache/relative-price.

The handler lives in `handlers/handle-violate-indicators` and calls into this module by indicator type; it does not interpret Trigger/Reentry/NoAction here—downstream logic can close positions on Trigger or allow reentry on Reentry.
