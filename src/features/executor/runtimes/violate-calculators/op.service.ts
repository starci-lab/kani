import {
    Injectable,
} from "@nestjs/common"
import {
    IndicatorName,
    LogicalOperator,
    Operation,
} from "@modules/databases"
import type {
    BotViolateIndicatorThresholdGroupSchema,
} from "@modules/databases"

/**
 * Context of current indicator values by name (e.g. pct, r2).
 * Used to evaluate threshold conditions.
 */
export type IndicatorValues = Partial<Record<IndicatorName, number>>

/**
 * Evaluates (op + value) conditions against current indicator values.
 * Used by violate calculators to decide trigger / reentry.
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
     * Evaluate a threshold group: indicators combined by operation (And / Or).
     * If a condition refers to an indicator name not present in values, it is treated as not satisfied.
     */
    evaluateGroup(
        values: IndicatorValues,
        group: BotViolateIndicatorThresholdGroupSchema,
    ): boolean {
        const { indicators, operation } = group
        if (indicators.length === 0) {
            return false
        }
        const results = indicators.map((t) => {
            const current = values[t.name]
            if (current === undefined) {
                return false
            }
            return this.evaluate(current,
                t.op,
                t.value)
        })
        if (operation === LogicalOperator.And) {
            return results.every(Boolean)
        }
        return results.some(Boolean)
    }
}
