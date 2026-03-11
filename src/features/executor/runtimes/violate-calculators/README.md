# Mathematical intuition: why this model can detect a dump

A **dump** is a rapid and significant decrease in the relative price of an asset within a short time window.  
Mathematically, a dump corresponds to a **large negative return occurring over a short time interval**.

The violate calculators detect such events by analysing the **relative price time series** and converting it into **scalar signals** that capture either:

1. the **magnitude of the move**, or  
2. the **strength and direction of a trend**.

These signals are then compared to configurable thresholds.

---

# Relative price time series

Let

P(t)

be the **relative price** of the target asset expressed in units of the quote asset at time t.

For example:

P(t) = target_price_USDT / quote_price_USDT

This removes market-wide effects (such as the overall movement of USDT pairs) and isolates the **relative movement between the two assets**.

The model analyses the behaviour of P(t) over a **fixed window**

τ

such as 10 seconds or 30 seconds.

---

# Detecting a dump using price change

The simplest signal is the **percentage move** over the window.

Let

P_first = P(t_first)

P_last = P(t_last)

The magnitude of the move is

Δ = | P_last / P_first − 1 |

This quantity represents the **relative change in price** over the window.

A **dump** corresponds to a large negative move:

P_last / P_first − 1 << 0

Since the model uses the absolute value, it detects **both pumps and dumps** as violations.

If

Δ ≥ θ_trigger

the movement is considered **abnormally large**, indicating a potential market event such as a dump.

---

# Detecting structured moves using regression

Price changes can also occur due to noise or temporary spikes.  
To distinguish **real directional moves** from noise, the model also measures the **trend structure** of the series.

Over the window τ, the model fits a linear regression:

P(t) ≈ a + b t

where

a is the intercept  
b is the **slope** (rate of change of price)

The slope represents how fast the price is moving.

To make the slope comparable across assets, it is converted to a **percentage change over the window**:

Δ_reg = | (b · T) / P_first |

where

T = t_last − t_first

This represents the **trend-implied price change** over the window.

---

# Filtering noise using R²

A large slope alone does not guarantee that the move is meaningful.  
The price series may contain noise or outliers.

To measure how well the regression line explains the data, the model computes the **coefficient of determination**:

R²

which satisfies

0 ≤ R² ≤ 1

R² ≈ 1 → the data closely follows a linear trend  
R² ≈ 0 → the data is mostly noise

Therefore, a strong directional move should satisfy both:

Δ_reg ≥ θ_trigger

and

R² ≥ ρ_min

This ensures that the detected move is **not random fluctuation**, but a **coherent directional movement**, which is characteristic of a real dump.

---

# Why this works for dump detection

A market dump typically exhibits three properties.

### 1. Large price displacement

The price drops significantly over a short interval.

This is captured by **PricePct**.

### 2. Consistent downward movement

During a dump, prices often move steadily downward rather than oscillating randomly.

This produces a **negative regression slope**.

### 3. Structured trend

Because many trades occur in the same direction during a dump, the price series often follows a clear trend.

This produces a **high R²**.

---

# Combined detection logic

The violate model therefore detects dumps when the relative price series exhibits:

- **large displacement** (PricePct), or
- **strong directional trend** (PriceRegression).

Formally, a violation is triggered when

Δ ≥ θ_trigger

or

Δ_reg ≥ θ_trigger AND R² ≥ ρ_min

These conditions correspond to the mathematical signature of a dump:  
**a large and structured movement of price over a short time interval**.

---

# Reentry condition

After a dump, the market may stabilise.  
Reentry is allowed once the signal falls below a smaller threshold:

Δ < θ_reentry

This indicates that the extreme movement has subsided and the market is returning to normal behaviour.

---

# Interpretation

In summary, the violate calculators detect dumps by analysing the **geometry of the price trajectory** over time:

- **PricePct** measures the **size of the move**
- **Regression slope** measures the **direction and speed of change**
- **R²** measures the **coherence of the trend**

Together, these metrics identify the mathematical signature of a dump:  
a **large, directional, and structured change in relative price over a short window**.