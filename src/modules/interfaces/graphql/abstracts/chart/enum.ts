import { registerEnumType } from "@nestjs/graphql"
import { createEnumType } from "@modules/utils"
import ms from "ms"

export enum ChartInterval {
    FifteenMinutes = "fifteenMinutes",
    ThirtyMinutes = "thirtyMinutes",
    OneHour = "oneHour",
    TwoHours = "twoHours",
    FourHours = "fourHours",
    Day = "day",
}

export const GraphQLTypeChartInterval = createEnumType(ChartInterval)
registerEnumType(GraphQLTypeChartInterval, {
    name: "ChartInterval",
    description: "The interval of the chart.",
    valuesMap: {    
        [GraphQLTypeChartInterval.FifteenMinutes]: {
            description: "15 minutes",
        },
        [GraphQLTypeChartInterval.ThirtyMinutes]: {
            description: "30 minutes",
        },
        [GraphQLTypeChartInterval.OneHour]: {
            description: "1 hour",
        },
        [GraphQLTypeChartInterval.TwoHours]: {
            description: "2 hours",
        },
        [GraphQLTypeChartInterval.FourHours]: {
            description: "4 hours",
        },
        [GraphQLTypeChartInterval.Day]: {
            description: "1 day",
        },
    },
})

export const chartIntervalToMsString = (
    interval: ChartInterval
): ms.StringValue => {
    const map: Record<ChartInterval, ms.StringValue> = {
        [ChartInterval.FifteenMinutes]: "15m",
        [ChartInterval.ThirtyMinutes]: "30m",
        [ChartInterval.OneHour]: "1h",
        [ChartInterval.TwoHours]: "2h",
        [ChartInterval.FourHours]: "4h",
        [ChartInterval.Day]: "1d",
    }
    return map[interval]
}

export enum ChartUnit {
    Usd = "usd",
}

export const GraphQLTypeChartUnit = createEnumType(ChartUnit)

registerEnumType(GraphQLTypeChartUnit, {
    name: "ChartUnit",
    description: "The unit of the chart.",
    valuesMap: {
        [GraphQLTypeChartUnit.Usd]: {
            description: "USD",
        },
    },
})