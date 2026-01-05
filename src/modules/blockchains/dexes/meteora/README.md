## Meteora DLMM — Fee calculation (as implemented in `fees.service.ts`)

The `fees.service.ts` implementation computes the **unclaimed fees** for a Meteora (DLMM) position by iterating each bin in the position range \([minBinId, maxBinId]\), then summing up total fees for **token X (tokenA)** and **token Y (tokenB)**.

### Inputs (concepts)

- **PositionV2** (on-chain):
  - `liquidityShares[i]`: the position’s liquidity share in bin \(i\) (which maps to a specific `binId`).
  - `feeInfos[i]`: the last “checkpoint” (snapshot) for that bin:
    - `feeXPerTokenComplete`
    - `feeYPerTokenComplete`
- **BinArray** (on-chain):
  - `bins[j].feeAmountXPerTokenStored`
  - `bins[j].feeAmountYPerTokenStored`
  - These are the bin’s current **cumulative fee-per-token** values stored in fixed-point format.

### Mapping index → binId → binArray → bin inside the binArray

The service iterates every index `i` in `position.liquidityShares`:

- **Current binId**:

```text
currentBinId = minBinId + i
```

- Each `BinArray` covers a contiguous `binId` range. The code uses `getBinArrayLowerUpperBinId(binArray.index)` to obtain `[lowerBinId, upperBinId]`, then finds which `BinArray` contains `currentBinId`.
- **Index inside the binArray**:

```text
j = currentBinId - lowerBinId
```

Then it reads `bins[j]` to get `feeAmount*PerTokenStored`.

### Per-bin fee formula

For each bin (each `i`):

- Skip if `liquidityShares[i] = 0`
- Compute the “fee per token” delta between current on-chain values and the last checkpoint:

```text
deltaX = feeAmountXPerTokenStored - feeXPerTokenComplete
deltaY = feeAmountYPerTokenStored - feeYPerTokenComplete
```

- Convert to actual fee amounts using liquidity (integer math):

```text
feeX_i = floor(liquidityShares_i * deltaX / Q128)
feeY_i = floor(liquidityShares_i * deltaY / Q128)
```

Where:

- `Q128 = 2^128` (fixed-point scale). This means `feeAmount*PerTokenStored` and `fee*PerTokenComplete` are stored in **Q128**.
- The code uses `BN` integer arithmetic, so division is **integer division** (floor).

### Summing across the full range

```text
totalFeeX = sum(feeX_i for i in bins)
totalFeeY = sum(feeY_i for i in bins)
```

These totals are still **raw token amounts** (smallest units).

### Converting to token units (decimals)

Finally, the service returns:

- `tokenA = computeDenomination(totalFeeX, tokenA.decimals)`
- `tokenB = computeDenomination(totalFeeY, tokenB.decimals)`

Conceptually:

```text
amountHuman = totalFee / (10^decimals)
```

and the helper formats/rounds using `fractionDigits` (default: 5).

### Important notes

- **Index alignment**: the code assumes `position.liquidityShares[i]` and `position.feeInfos[i]` share the same `i`, corresponding to `binId = minBinId + i`.
- **Precision**: because of integer division (`BN.div`), each bin’s result is truncated during division by `Q128`.
- **Data source**: `PositionV2` and `BinArray` accounts are fetched on-chain and decoded using Meteora’s IDL (`createProgram` + `decodeAccount`).

