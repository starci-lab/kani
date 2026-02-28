# Price Calculation Service - Algorithm Documentation

## Overview

The `PriceCalculationService` analyzes price windows to compute comprehensive statistical metrics including TWAP (Time-Weighted Average Price), trend analysis, volatility, drawdown, and peak-to-now dump/reversal detection. It processes historical price data from InfluxDB and produces a rich set of metrics for price behavior analysis.

## Main Algorithm Flow

### `analyzePriceWindow()`

The main entry point that orchestrates the entire analysis pipeline:

1. **Data Retrieval**: Queries price data from InfluxDB for a given token, time interval, and market listing
2. **Data Preparation**: Sorts prices chronologically to ensure temporal ordering
3. **Basic Statistics**: Computes min/max/range and percentage metrics
4. **Risk Metrics**: Calculates maximum drawdown and volatility
5. **Trend Analysis**: Performs linear regression and efficiency ratio analysis
6. **Peak Analysis**: Identifies peak price and computes dump/reversal metrics
7. **Shape Classification**: Categorizes the price pattern (Straight/TrendNoisy/Choppy)

## Core Algorithms

### 1. Maximum Drawdown (`maxDrawdownPct`)

**Purpose**: Measures the largest peak-to-trough decline within the price window.

**Algorithm**:
```
1. Initialize peak = first price
2. Initialize maxDd = 0
3. For each price p in sequence:
   - If p > peak: update peak = p
   - Calculate drawdown: dd = (peak - p) / peak
   - Track maximum: maxDd = max(maxDd, dd)
4. Return maxDd * 100 (as percentage)
```

**Time Complexity**: O(n) where n is the number of price points

**Key Insight**: This algorithm tracks the running peak and measures how far each point falls from that peak, capturing the worst-case decline scenario.

### 2. Efficiency Ratio (`efficiencyRatio`)

**Purpose**: Measures how "straight" or "efficient" a price trend is. A value near 1 indicates a strong directional move with minimal zigzag, while values near 0 indicate choppy, sideways movement.

**Algorithm**:
```
1. Calculate net movement: |last_price - first_price|
2. Calculate total movement: sum of |price[i] - price[i-1]| for all i
3. Return net / total (or 1 if total is 0)
```

**Formula**: 
```
Efficiency Ratio = |P_n - P_0| / Σ|P_i - P_{i-1}|
```

**Interpretation**:
- **~1.0**: Straight trend (minimal retracement)
- **~0.0**: Choppy/zigzag pattern (lots of back-and-forth)
- **0.5**: Moderate efficiency

**Example**:
- If price goes from 100 → 110 in a straight line: efficiency = 1.0
- If price goes 100 → 105 → 103 → 107 → 110: efficiency ≈ 0.4 (more choppy)

### 3. Peak-to-Now Metrics (`peakToNowMetrics`)

**Purpose**: Detects and quantifies price dumps or reversals from the peak price within the window.

**Algorithm**:
```
1. Find peak price and its index in the sorted array
2. Get last price (most recent)
3. Calculate drop percentage: (last - peak) / peak * 100
4. Calculate bars since peak: lastIndex - peakIndex
5. Calculate time delta: lastTime - peakTime (in minutes)
6. Calculate slope: dropFromPeakPct / barsSincePeak
7. Calculate velocity: dropFromPeakPct / dtMin
```

**Metrics Computed**:
- `dropFromPeakPct`: Percentage change from peak to current (negative = dump)
- `barsSincePeak`: Number of price bars since the peak occurred
- `slopeFromPeakPctPerBar`: Rate of decline per bar
- `velFromPeakPctPerMin`: Rate of decline per minute

**Use Case**: Identifies rapid price dumps (e.g., drop ≥ 5% within 30 bars) for reversal detection.

## Statistical Calculations

### Volatility

**Method**: Standard deviation of returns (percentage changes between consecutive prices)

**Algorithm**:
```
1. Calculate returns: (price[i] - price[i-1]) / price[i-1] for each i
2. Compute standard deviation of returns array
```

**Interpretation**: Higher volatility = more price fluctuation, lower = more stable.

### Linear Regression & R²

**Purpose**: Quantifies trend direction and strength.

**Algorithm**:
```
1. Map prices to points: (index, price) pairs
2. Perform linear regression: y = mx + b
3. Calculate R² (coefficient of determination)
```

**Metrics**:
- `slope` (m): Trend direction and magnitude
  - Positive = uptrend
  - Negative = downtrend
  - Near zero = sideways
- `r2`: Trend strength (0-1)
  - 1.0 = perfect linear trend
  - 0.0 = no linear relationship
  - ≥0.8 = strong trend
  - ≥0.4 = moderate trend

### Percentage Metrics

All percentage calculations use the base price as denominator:

- **`rangePct`**: `(max - min) / min * 100` - Total price range as % of minimum
- **`fromLowToLastPct`**: `(last - min) / min * 100` - Current position relative to low
- **`fromHighToLastPct`**: `(last - max) / max * 100` - Current position relative to high (usually negative)
- **`drawdownPct`**: Maximum drawdown percentage (from `maxDrawdownPct`)

## Shape Classification Logic

The service classifies price patterns into three categories:

### Classification Rules

```typescript
if (r2 >= 0.8 && efficiencyRatio >= 0.7) {
    shape = TwapShape.Straight      // Strong, clean trend
} else if (r2 >= 0.4 || efficiencyRatio >= 0.4) {
    shape = TwapShape.TrendNoisy    // Trend exists but with noise
} else {
    shape = TwapShape.Choppy        // No clear trend, sideways/volatile
}
```

**Decision Matrix**:

| R² | Efficiency Ratio | Shape |
|---|---|---|
| ≥ 0.8 | ≥ 0.7 | **Straight** |
| ≥ 0.4 | any | **TrendNoisy** |
| any | ≥ 0.4 | **TrendNoisy** |
| < 0.4 | < 0.4 | **Choppy** |

**Rationale**:
- **Straight**: Both high R² (strong linear fit) and high efficiency (minimal zigzag) indicate a clean trend
- **TrendNoisy**: Moderate R² or efficiency suggests a trend exists but with significant noise/retracements
- **Choppy**: Low values in both metrics indicate no clear directional movement

## TWAP Calculation

**Note**: This implementation uses a simple arithmetic mean, not true time-weighted averaging.

```typescript
twap = mean(prices) = sum(prices) / count(prices)
```

For true TWAP, you would weight each price by its time duration, but this simplified version treats all samples equally.

## Output Structure

The service returns a `TwapResult` object containing:

### Core Metrics
- `twap`: Time-weighted average price (simple mean)
- `maxPrice`, `minPrice`, `diffPrice`: Raw price statistics

### Percentage Metrics
- `rangePct`: Price range as percentage
- `fromLowToLastPct`, `fromHighToLastPct`: Position metrics
- `drawdownPct`: Maximum drawdown

### Trend Metrics
- `slope`: Linear regression slope
- `r2`: Coefficient of determination
- `efficiencyRatio`: Directional efficiency (0-1)
- `volatility`: Standard deviation of returns
- `shape`: Classification (Straight/TrendNoisy/Choppy)

### Peak Metrics
- `peakPrice`, `peakTime`, `peakIndex`: Peak identification
- `barsSincePeak`: Bars elapsed since peak
- `dropFromPeakPct`: Percentage drop from peak
- `slopeFromPeakPctPerBar`: Decline rate per bar
- `velFromPeakPctPerMin`: Decline rate per minute

### Metadata
- `firstPrice`, `lastPrice`: Boundary prices
- `sampleCount`: Number of price points analyzed
- `startTime`, `endTime`: Time window boundaries

## Performance Considerations

- **Time Complexity**: O(n) for most operations, O(n log n) for sorting
- **Space Complexity**: O(n) for storing sorted prices and intermediate arrays
- **Optimization**: Consider caching results for frequently queried intervals

## Usage Example

```typescript
const result = await priceCalculationService.analyzePriceWindow({
    id: "token-123",
    intervalMs: 3600000, // 1 hour window
    marketListingId: "market-abc"
});

if (result) {
    console.log(`TWAP: ${result.twap}`);
    console.log(`Shape: ${result.shape}`);
    console.log(`Drawdown: ${result.drawdownPct}%`);
    console.log(`Drop from peak: ${result.dropFromPeakPct}%`);
}
```

## Future Enhancements

- True time-weighted TWAP calculation
- Additional shape categories (e.g., "Dumping" for rapid declines)
- Configurable thresholds for shape classification
- Support for multiple timeframes in a single analysis
