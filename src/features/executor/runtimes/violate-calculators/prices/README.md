# Relative Price Computation with Linear Interpolation

This document explains how a **relative price time series** is computed from two price series **A** and **B** using **linear interpolation**.

## Input

We have two time series:

* **A(t)**: price of asset A at time `t`
* **B(t)**: price of asset B at time `t`

The timestamps are not always aligned, meaning that prices for A and B may be recorded at different times.

To compute a consistent **relative price**, we must first align the two series in time.

---

# Anchor series

In this example, **series B is used as the anchor**.

This means:

* Output timestamps = timestamps of **B**
* For each timestamp `t` in **B**, we compute the corresponding **A(t)**

If A does not have a price exactly at time `t`, we estimate it using **linear interpolation**.

---

# Linear interpolation

Suppose we want the price of A at time `t`, and we know two surrounding points:

```
t0 ≤ t ≤ t1
```

with prices

```
A(t0) = p0
A(t1) = p1
```

We compute:

```
α = (t - t0) / (t1 - t0)
```

Then:

```
A_interp(t) = p0 + α (p1 - p0)
```

This assumes the price moves **linearly** between the two observations.

---

# Relative price

Once we obtain `A_interp(t)`, we compute the **relative price**:

```
R(t) = B(t) / A_interp(t)
```

The output series therefore becomes:

```
out(t) = B(t) / A_interp(t)
```

---

# Example

### Series A

```
time   price
0      10
10     12
20     14
```

### Series B (anchor)

```
time   price
0      100
5      105
10     110
15     115
20     120
```

---

## Step 1 — Interpolate A

We compute `A_interp(t)` for timestamps of B.

### t = 5

Between:

```
A(0) = 10
A(10) = 12
```

```
α = (5 - 0) / (10 - 0) = 0.5
```

```
A_interp(5) = 10 + 0.5*(12 - 10)
            = 11
```

---

### t = 15

Between:

```
A(10) = 12
A(20) = 14
```

```
α = (15 - 10) / (20 - 10) = 0.5
```

```
A_interp(15) = 12 + 0.5*(14 - 12)
             = 13
```

---

# Step 2 — Compute relative price

```
R(t) = B(t) / A_interp(t)
```

| time | B   | A_interp | R = B/A |
| ---- | --- | -------- | ------- |
| 0    | 100 | 10       | 10      |
| 5    | 105 | 11       | 9.545   |
| 10   | 110 | 12       | 9.167   |
| 15   | 115 | 13       | 8.846   |
| 20   | 120 | 14       | 8.571   |

---

# Output

```
time   relative_price
0      10
5      9.545
10     9.167
15     8.846
20     8.571
```

---

# Summary

The algorithm works as follows:

1. Choose an **anchor series** (here: B).
2. For each timestamp `t` in the anchor series:

   * find the surrounding points of A
   * compute **A_interp(t)** using linear interpolation
3. Compute the **relative price**

```
R(t) = B(t) / A_interp(t)
```

This produces a synchronized relative price series suitable for **regression, anomaly detection, or dump detection**.
