import {
    Injectable,
} from "@nestjs/common"
import {
    IndicatorName,
    Operation,
} from "@modules/databases"
import type {
    BotViolateIndicatorOpSchema,
} from "@modules/databases"

/**
 * Context of current indicator values by name (e.g. pct, r2).
 * Used to evaluate threshold conditions.
 */
export type IndicatorValues = Partial<Record<IndicatorName, number>>

/**
 * Evaluates (op + value) conditions against current indicator values.
 * Used by violate calculators to decide trigger / emergency exit / reentry.
 */
@Injectable()
export class OpService {
    /**
     * Evaluate a single condition: does (currentValue op thresholdValue) hold?
     */
    evaluate(
        currentValue: number,
        op: Operation,
        thresholdValue: number,
    ): boolean {
        switch (op) {
            case Operation.Eq:
                return currentValue === thresholdValue
            case Operation.Ne:
                return currentValue !== thresholdValue
            case Operation.Gt:
                return currentValue > thresholdValue
            case Operation.Gte:
                return currentValue >= thresholdValue
            case Operation.Lt:
                return currentValue < thresholdValue
            case Operation.Lte:
                return currentValue <= thresholdValue
            default:
                return false
        }
    }

    /**
     * Evaluate all conditions in a threshold array.
     * Returns true only if every condition is satisfied (AND).
     * If a condition refers to an indicator name not present in values, it is treated as not satisfied.
     */
    evaluateAll(
        values: IndicatorValues,
        thresholds: Array<BotViolateIndicatorOpSchema>,
    ): boolean {
        if (thresholds.length === 0) {
            return false
        }
        for (const t of thresholds) {
            const current = values[t.name]
            if (current === undefined) {
                return false
            }
            if (!this.evaluate(current, t.op, t.value)) {
                return false
            }
        }
        return true
    }
}
