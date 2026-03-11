# Violate calculators

Module that evaluates **violate indicators**: it turns a price series into one or more scalar signals, compares them to configurable thresholds, and returns a status (**Trigger**, **Reentry**, or **NoAction**). The goal is to detect a **violation** (e.g. sharp move in relative price beyond a threshold) and to recognise when conditions are safe again for **reentry**.

---

## Why this model can detect a violation

A **violation** is when the relative price (e.g. token vs USDC) moves by a large amount over the time window, exceeding the trigger threshold. The model does two things:

1. **Turn the series into numbers**  
   Over a fixed time window \( \tau \) (e.g. 10s or 30s), we compute one or two scalars from the relative price series \( P(t) \):
   - **PricePct**: size of the move, e.g. \( \Delta = \bigl| \tfrac{P(t_{\mathrm{last}})}{P(t_{\mathrm{first}})} - 1 \bigr| \).
   - **PriceRegression**: trend strength and quality — fit \( P(t) \approx a + b\,t \), then use the slope (as a percentage over the window) and R².

2. **Compare to thresholds**  
   We define two sets of conditions:
   - **Trigger**: e.g. “\( \Delta \geq \theta_{\mathrm{trig}} \)” (and optionally “R² ≥ …”). If all are satisfied → **Trigger** (violation).
   - **Reentry**: e.g. “\( \Delta < \theta_{\mathrm{reentry}} \)” (and optionally R²). If all are satisfied → **Reentry** (move has eased, safe to consider re-entering).

So a **violation** is detected when the measured move (or regression-based move) **exceeds** the trigger threshold; **reentry** is allowed when the same metric **falls below** a (smaller) reentry threshold. Order of evaluation: trigger first, then reentry; if neither passes → **NoAction**.

---

## Mathematical setup

- **Relative price** \( P(t) \): price of the target asset in units of the quote asset (e.g. token per USDC), over a window of length \( \tau \) (milliseconds).
- **Time window** \( \tau \): fixed length of the lookback (e.g. \( \tau = 10\,000 \) ms or \( 30\,000 \) ms).

### PricePct (discrete move)

- Take first and last observed price in the window: \( P_{\mathrm{first}} \), \( P_{\mathrm{last}} \).
- **Signal**:
  \[
  \Delta
  \;=\;
  \left| \frac{P_{\mathrm{last}}}{P_{\mathrm{first}}} - 1 \right|.
  \]
- **Trigger**: e.g. \( \Delta \geq \theta_{\mathrm{trig}} \) (e.g. 0.01 = 1%).
- **Reentry**: e.g. \( \Delta < \theta_{\mathrm{reentry}} \) (e.g. 0.005 = 0.5%), with \( \theta_{\mathrm{reentry}} < \theta_{\mathrm{trig}} \).

So a **violation** is when the relative price has moved by at least \( \theta_{\mathrm{trig}} \) in the window; **reentry** when the move is below \( \theta_{\mathrm{reentry}} \).

### PriceRegression (trend + fit quality)

- **Model**: \( P(t) \approx a + b\,t \) over the window (linear regression).
- **Slope** \( b \): rate of change of price per unit time.
- **Percentage change implied by the trend** over the window \( \tau \):
  \[
  \Delta_{\mathrm{reg}}
  \;=\;
  \left| \frac{b \cdot (t_{\mathrm{last}} - t_{\mathrm{first}})}{P_{\mathrm{first}}} \right|
  \;=\;
  \left| \frac{b \cdot T}{P_{\mathrm{first}}} \right|,
  \]
  where \( T = t_{\mathrm{last}} - t_{\mathrm{first}} \approx \tau \) (length of the window).
- **R²**: coefficient of determination of the regression (how well the line fits the data; \( 0 \leq R^2 \leq 1 \)).

**Trigger**: e.g. \( \Delta_{\mathrm{reg}} \geq \theta_{\mathrm{trig}} \) **and** \( R^2 \geq \rho_{\min} \) (e.g. 0.64). So we only treat as a **violation** when there is both a large enough trend and a clear linear move (not noise).

**Reentry**: e.g. \( \Delta_{\mathrm{reg}} < \theta_{\mathrm{reentry}} \) **and** \( R^2 < \rho_{\min} \) (or another condition), so we only allow reentry when the trend has weakened and/or the line no longer fits well.

This way the model can **detect a violation** when:
- the relative price moves by more than \( \theta_{\mathrm{trig}} \) in the window (PricePct), or  
- the relative price has a strong **linear trend** of size \( \geq \theta_{\mathrm{trig}} \) with high R² (PriceRegression),

and **allow reentry** when the same metric falls below \( \theta_{\mathrm{reentry}} \) (and, for regression, when R² condition is met).

---

## Thresholds (generic form)

Each threshold is a **set of conditions**; **all** must hold (AND):

- Each condition: compare a **quantity** \( x \) (e.g. \( \Delta \), \( \Delta_{\mathrm{reg}} \), or \( R^2 \)) to a **reference** \( v \) with a relation \( \circ \in \{ =, \neq, <, \leq, >, \geq \} \): i.e. \( x \circ v \).
- **Trigger**: e.g. \( \Delta \geq \theta_{\mathrm{trig}} \); for regression, \( \Delta_{\mathrm{reg}} \geq \theta_{\mathrm{trig}} \wedge R^2 \geq \rho_{\min} \).
- **Reentry**: e.g. \( \Delta < \theta_{\mathrm{reentry}} \); for regression, \( \Delta_{\mathrm{reg}} < \theta_{\mathrm{reentry}} \wedge R^2 < \rho_{\min} \) (or similar).

Evaluation order: if trigger conditions hold → **Trigger**; else if reentry conditions hold → **Reentry**; else → **NoAction**.

---

## Relative price \( P(t) \)

\( P(t) \) is “target asset per unit of quote asset”. It is built from one or two CEX price series depending on which side is USDT:

- If target = USDT: use quote price in USDT (already a “per USDT” price).
- If quote = USDT: use target price in USDT, then \( P = 1 / \text{(target in USDT)} \).
- If neither is USDT: for each time \( t \), take target price and quote price (interpolated if needed) and form \( P(t) = \text{target}(t) / \text{quote}(t) \).

All comparisons (violation vs trigger, recovery vs reentry) are then done on this single series \( P(t) \) over the window \( \tau \).

---

## Summary

- **Violation (Trigger)**: Compare a scalar derived from \( P(t) \) (either discrete move \( \Delta \) or regression-based \( \Delta_{\mathrm{reg}} \) plus R²) to a **trigger** threshold; if the move is large enough (and, for regression, linear enough), output **Trigger**.
- **Reentry**: Compare the same scalar(s) to a **reentry** threshold (smaller than trigger); if the move is below that, output **Reentry**.
- No code in this README; the implementation lives in the calculator and threshold-evaluation logic in this module.
