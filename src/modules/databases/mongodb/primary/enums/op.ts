import { createEnumType } from "@modules/common"
import { registerEnumType } from "@nestjs/graphql"

/**
 * The operation.
 */
export enum Operation {
    /**
     * The equal operation.
     */
    Eq = "eq",
    /**
     * The greater than operation.
     */
    Gt = "gt",
    /**
     * The greater than or equal to operation.
     */
    Gte = "gte",
    /**
     * The less than operation.
     */
    Lt = "lt",
    /**
     * The less than or equal to operation.
     */
    Lte = "lte",
    /**
     * The not equal operation.
     */
    Ne = "ne",
}

export const GraphQLTypeOperation = createEnumType(Operation)

registerEnumType(
    GraphQLTypeOperation,
    {
        name: "Operation",
        description: "The operation",
        valuesMap: {
            [Operation.Eq]: {
                description: "The equal operation"
            },
            [Operation.Gt]: {
                description: "The greater than operation"
            },
            [Operation.Gte]: {
                description: "The greater than or equal to operation"
            },
            [Operation.Lt]: {
                description: "The less than operation"
            },
            [Operation.Lte]: {
                description: "The less than or equal to operation"
            },
            [Operation.Ne]: {
                description: "The not equal operation"
            },
        }
    }
)

/**
 * Logical operator to combine multiple indicator conditions.
 */
export enum LogicalOperator {
    And = "and",
    Or = "or",
}

export const GraphQLTypeLogicalOperator = createEnumType(LogicalOperator)

registerEnumType(
    GraphQLTypeLogicalOperator,
    {
        name: "LogicalOperator",
        description: "Logical operator to combine indicator conditions",
        valuesMap: {
            [LogicalOperator.And]: {
                description: "All conditions must hold (AND)",
            },
            [LogicalOperator.Or]: {
                description: "At least one condition must hold (OR)",
            },
        },
    }
)